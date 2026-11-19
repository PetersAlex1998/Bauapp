/**
 * RECHENLOGIK des Verwaltertools: Mieten, Rückstände, Nebenkosten, 360°-Status.
 * Reine Funktionen ohne Oberfläche – dadurch einzeln prüfbar.
 */
import { alle, finde, heute, type Satz } from './speicher';

export const zahl = (x: any) => (Number.isFinite(Number(x)) ? Number(x) : 0);
export const monatVon = (datum: string) => (datum || '').slice(0, 7);
export const monatHeute = () => monatVon(heute());

export function monatPlus(monat: string, n: number): string {
  const [j, m] = monat.split('-').map(Number);
  const d = new Date(Date.UTC(j, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}
export function datumPlus(datum: string, tage: number): string {
  const d = new Date(datum + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + tage);
  return d.toISOString().slice(0, 10);
}
export function datumPlusMonate(datum: string, n: number): string {
  const d = new Date(datum + 'T00:00:00Z');
  const tag = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const letzter = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(tag, letzter));
  return d.toISOString().slice(0, 10);
}
export const tageBis = (datum: string) => Math.round((Date.parse(datum + 'T00:00:00Z') - Date.parse(heute() + 'T00:00:00Z')) / 86400000);

/* ---------- Zuordnungen ---------- */
export const einheitenVon = (objektId: string) => alle('einheiten').filter((e) => e.objektId === objektId);
export const objektVonMieter = (m: Satz) => finde('einheiten', m.einheitId)?.objektId as string | undefined;
export const mieterVon = (objektId: string) => alle('mieter').filter((m) => objektVonMieter(m) === objektId);

/* ---------- Mieten ---------- */
export const aktivIm = (m: Satz, monat: string) => !!m.beginn && monatVon(m.beginn) <= monat && (!m.ende || monatVon(m.ende) >= monat);
/* ---------- Mietverlauf und Mieterhöhung ---------- */
export const MODERNISIERUNG = 'Modernisierung (§ 559)';
/** Staffeln aus dem Vertrag lesen: je Zeile Datum und Betrag, z. B. „01.12.2027: 720,00 €“ */
export function staffelnVon(m: Satz): { ab: string; kaltmiete: number }[] {
  if (m.mietart !== 'Staffelmiete') return [];
  return String(m.staffeln ?? '').split('\n').map((zeile) => {
    const d = zeile.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})|(\d{4})-(\d{2})-(\d{2})/);
    const rest = d ? zeile.slice((d.index ?? 0) + d[0].length) : '';
    const b = rest.match(/(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:\.\d{1,2})?)/);
    if (!d || !b) return null;
    const ab = d[4] ? `${d[4]}-${d[5]}-${d[6]}` : `${d[3]}-${d[2].padStart(2, '0')}-${d[1].padStart(2, '0')}`;
    const betrag = b[1].includes(',') ? Number(b[1].replace(/\./g, '').replace(',', '.')) : Number(b[1]);
    return Number.isFinite(betrag) && betrag > 0 ? { ab, kaltmiete: betrag } : null;
  }).filter((x): x is { ab: string; kaltmiete: number } => !!x).sort((a, b) => a.ab.localeCompare(b.ab));
}
/** Mietverlauf: erfasste Änderungen plus die vertraglichen Staffeln (gelten automatisch). */
export function verlaufVon(m: Satz): Satz[] {
  const echt = alle('mietaenderungen').filter((x) => x.mieterId === m.id && x.ab);
  const staffeln = staffelnVon(m).filter((st) => !echt.some((x) => x.ab === st.ab))
    .map((st, i) => ({ id: `staffel-${m.id}-${i}`, mieterId: m.id, ab: st.ab, kaltmiete: st.kaltmiete, grund: 'Staffelmiete', automatisch: true } as Satz));
  const alle_ = [...echt, ...staffeln].sort((a, b) => String(a.ab).localeCompare(String(b.ab)));
  // „bisherige Miete“ der automatischen Staffeln aus der Reihenfolge ergänzen
  let vorher = zahl(m.kaltmiete);
  for (const x of alle_) { if (x.automatisch) x.alt = vorher; vorher = zahl(x.kaltmiete); }
  return alle_;
}
/** Kaltmiete, die an einem Stichtag galt. Ohne erfasste Änderungen gilt: unverändert seit Mietbeginn. */
export function mieteAm(m: Satz, tag: string): number {
  const v = verlaufVon(m);
  const bis = v.filter((x) => x.ab <= tag);
  if (bis.length) return zahl(bis[bis.length - 1].kaltmiete);
  if (v.length && v[0].alt !== undefined && v[0].alt !== '') return zahl(v[0].alt);
  return zahl(m.kaltmiete);
}
export const sollIm = (m: Satz, monat: string) => mieteAm(m, `${monat}-01`) + zahl(m.nebenkosten);
export const soll = (m: Satz) => sollIm(m, monatHeute());
/** Beginn des dritten Monats nach Zugang des Erhöhungsverlangens (§ 558b BGB) */
export const wirksamAb = (zugang: string) => `${monatPlus(monatVon(zugang), 3)}-01`;
/** Ende des übernächsten Monats nach Zugang: Frist zur Zustimmung (§ 558b BGB) */
export const zustimmungBis = (zugang: string) => datumPlus(wirksamAb(zugang), -1);

/** Prüft, ob und wie weit die Miete nach § 558 BGB erhöht werden kann (Annahmen siehe README). */
export function erhoehungspruefung(m: Satz, zugang: string) {
  const einheit = finde('einheiten', m.einheitId);
  const objekt = finde('objekte', einheit?.objektId);
  const v = verlaufVon(m);
  // Erhöhungen nach § 559 zählen für die Sperrfrist nicht mit.
  const letzte = [m.beginn, ...v.filter((x) => x.grund !== MODERNISIERUNG).map((x) => x.ab)].filter(Boolean).sort().pop() as string;
  const wirksam = wirksamAb(zugang);
  const sperreOk = !!letzte && zugang >= datumPlusMonate(letzte, 12) && wirksam >= datumPlusMonate(letzte, 15);
  let frueh = letzte ? datumPlusMonate(letzte, 12) : heute();
  for (let i = 0; letzte && i < 200 && wirksamAb(frueh) < datumPlusMonate(letzte, 15); i++) frueh = datumPlus(frueh, 1);
  const satz = objekt?.angespannt ? 0.15 : 0.2;
  const stichtag = datumPlusMonate(wirksam, -36);
  const basis = mieteAm(m, stichtag);
  const modernisierung = v.filter((x) => x.grund === MODERNISIERUNG && x.ab > stichtag).reduce((s, x) => s + zahl(x.kaltmiete) - zahl(x.alt), 0);
  const kappung = Math.round((basis * (1 + satz) + modernisierung) * 100) / 100;
  const flaeche = zahl(einheit?.flaeche);
  const vm = zahl(einheit?.vergleichsmiete);
  const vergleich = flaeche && vm ? Math.round(flaeche * vm * 100) / 100 : 0;
  const aktuell = mieteAm(m, heute()); // schon vereinbarte, aber noch nicht gültige Erhöhungen zählen noch nicht
  const ziel = vergleich ? Math.round(Math.min(vergleich, kappung) * 100) / 100 : 0;
  return { einheit, objekt, letzte, wirksam, sperreOk, frueh, satz, stichtag, basis, kappung, flaeche, vm, vergleich, aktuell, ziel, erhoehung: Math.max(0, Math.round((ziel - aktuell) * 100) / 100), keineEinheitsdaten: !vergleich };
}
export const gezahlt = (m: Satz, monat?: string) =>
  alle('zahlungen').filter((z) => z.mieterId === m.id && (!monat || z.monat === monat)).reduce((s, z) => s + zahl(z.betrag), 0);

/** Offener Betrag eines Mietverhältnisses bis einschließlich des laufenden Monats. */
export function rueckstand(m: Satz): number {
  if (!m.beginn) return 0;
  const bis = m.ende && monatVon(m.ende) < monatHeute() ? monatVon(m.ende) : monatHeute();
  let sollSumme = 0, n = 0;
  for (let mo = monatVon(m.beginn); mo <= bis && n < 600; mo = monatPlus(mo, 1), n++) sollSumme += sollIm(m, mo);
  return Math.max(0, Math.round((sollSumme - gezahlt(m)) * 100) / 100);
}
export function mahnstufe(m: Satz): { stufe: 0 | 1 | 2 | 3; text: string } {
  const offen = rueckstand(m);
  const miete = soll(m) || 1;
  if (offen <= 0.005) return { stufe: 0, text: 'Ausgeglichen' };
  if (offen < miete) return { stufe: 1, text: 'Teilrückstand' };
  if (offen < 2 * miete) return { stufe: 2, text: 'Eine Monatsmiete offen' };
  return { stufe: 3, text: 'Ab zwei Monatsmieten: rechtliche Schritte prüfen' };
}

/* ---------- Nebenkostenabrechnung ---------- */
export const tageZwischen = (von: string, bis: string) => Math.round((Date.parse(bis + 'T00:00:00Z') - Date.parse(von + 'T00:00:00Z')) / 86400000);
export function nebenkosten(objektId: string, jahr: number) {
  const einheiten = einheitenVon(objektId);
  const belege = alle('kosten').filter((k) => k.objektId === objektId && k.umlage && (k.datum || '').startsWith(String(jahr)));
  const gruppen = new Map<string, { art: string; schluessel: string; summe: number }>();
  for (const b of belege) {
    const key = `${b.kostenart}|${b.schluessel || 'Wohnfläche'}`;
    const g = gruppen.get(key) ?? { art: b.kostenart, schluessel: b.schluessel || 'Wohnfläche', summe: 0 };
    g.summe += zahl(b.betrag);
    gruppen.set(key, g);
  }
  const kostenarten = [...gruppen.values()].sort((a, b) => a.art.localeCompare(b.art));

  // Nutzungszeit je Mietverhältnis tagesgenau; Vorauszahlungen je angefangenem Monat (Soll)
  const jahrBeginn = `${jahr}-01-01`, jahrEnde = `${jahr}-12-31`;
  const jahrTage = tageZwischen(jahrBeginn, jahrEnde) + 1;
  const mv = mieterVon(objektId)
    .map((m) => {
      const von = m.beginn && m.beginn > jahrBeginn ? m.beginn : jahrBeginn;
      const bis = m.ende && m.ende < jahrEnde ? m.ende : jahrEnde;
      const tage = m.beginn && m.beginn <= jahrEnde && (!m.ende || m.ende >= jahrBeginn) ? tageZwischen(von, bis) + 1 : 0;
      let monate = 0;
      for (let i = 1; i <= 12; i++) if (aktivIm(m, `${jahr}-${String(i).padStart(2, '0')}`)) monate++;
      return { m, monate, tage, von, bis, einheit: finde('einheiten', m.einheitId)! };
    })
    .filter((x) => x.tage > 0 && x.einheit);

  const flaecheGesamt = einheiten.reduce((s, e) => s + zahl(e.flaeche), 0) * jahrTage;
  const einheitenGesamt = einheiten.length * jahrTage;
  const personenGesamt = mv.reduce((s, x) => s + Math.max(1, zahl(x.m.personen)) * x.tage, 0);

  const zeilen = mv.map(({ m, monate, tage, von, bis, einheit }) => {
    const posten = kostenarten.map((k) => {
      let anteil = 0;
      if (k.schluessel === 'Einheiten') anteil = einheitenGesamt ? tage / einheitenGesamt : 0;
      else if (k.schluessel === 'Personen') anteil = personenGesamt ? (Math.max(1, zahl(m.personen)) * tage) / personenGesamt : 0;
      else anteil = flaecheGesamt ? (zahl(einheit.flaeche) * tage) / flaecheGesamt : 0;
      return { art: k.art, schluessel: k.schluessel, betrag: Math.round(k.summe * anteil * 100) / 100 };
    });
    const summe = Math.round(posten.reduce((s, p) => s + p.betrag, 0) * 100) / 100;
    const voraus = Math.round(zahl(m.nebenkosten) * monate * 100) / 100;
    return { mieter: m, einheit, monate, tage, jahrTage, von, bis, posten, summe, voraus, saldo: Math.round((summe - voraus) * 100) / 100 };
  });
  const gesamt = Math.round(kostenarten.reduce((s, k) => s + k.summe, 0) * 100) / 100;
  const umgelegt = Math.round(zeilen.reduce((s, z) => s + z.summe, 0) * 100) / 100;
  return { kostenarten, zeilen, gesamt, umgelegt, eigentuemer: Math.round((gesamt - umgelegt) * 100) / 100, ohneFlaeche: einheiten.some((e) => !zahl(e.flaeche)) };
}

/* ---------- 360°-Status eines Objekts ---------- */
export type Zustand = 'gut' | 'achtung' | 'kritisch' | 'aus';
export function status360(objektId: string): Record<'Verwalten' | 'Betreuen' | 'Erneuern' | 'Entwickeln', { zustand: Zustand; text: string }> {
  const objekt = finde('objekte', objektId);
  const gebucht = (k: string) => (objekt?.leistungen ?? []).includes(k);
  const aus = { zustand: 'aus' as Zustand, text: 'Nicht gebucht' };
  const h = heute();

  // Verwalten: Rückstände und Fristen
  const mieter = mieterVon(objektId);
  const stufe = Math.max(0, ...mieter.map((m) => mahnstufe(m).stufe));
  const fristen = alle('fristen').filter((x) => x.objektId === objektId && !x.erledigt);
  const fristUeber = fristen.filter((x) => x.faellig < h).length;
  const fristBald = fristen.filter((x) => x.faellig >= h && tageBis(x.faellig) <= 30).length;
  const verwalten = !gebucht('Verwalten') ? aus
    : stufe >= 2 || fristUeber ? { zustand: 'kritisch' as Zustand, text: [fristUeber && `${fristUeber} Frist(en) überfällig`, stufe >= 2 && 'Mietrückstand'].filter(Boolean).join(', ') }
    : stufe === 1 || fristBald ? { zustand: 'achtung' as Zustand, text: [fristBald && `${fristBald} Frist(en) in 30 Tagen`, stufe === 1 && 'Teilrückstand'].filter(Boolean).join(', ') }
    : { zustand: 'gut' as Zustand, text: 'Alles im Plan' };

  // Betreuen: Dienste und Meldungen
  const dienste = alle('service').filter((x) => x.objektId === objektId && x.rhythmus !== 'Nach Bedarf');
  const dienstUeber = dienste.filter((x) => x.naechster < h).length;
  const meldungen = alle('vorgaenge').filter((x) => x.objektId === objektId && x.status !== 'Erledigt');
  const notfall = meldungen.some((x) => x.kategorie === 'Notfall');
  const betreuen = !gebucht('Betreuen') ? aus
    : notfall || dienste.some((x) => tageBis(x.naechster) < -3) ? { zustand: 'kritisch' as Zustand, text: notfall ? 'Notfall offen' : 'Dienst überfällig' }
    : dienstUeber || meldungen.length ? { zustand: 'achtung' as Zustand, text: [meldungen.length && `${meldungen.length} Meldung(en) offen`, dienstUeber && `${dienstUeber} Dienst(e) fällig`].filter(Boolean).join(', ') }
    : { zustand: 'gut' as Zustand, text: 'Alles erledigt' };

  // Erneuern: laufende Aufträge
  const auftraege = alle('auftraege').filter((x) => x.objektId === objektId && x.status !== 'Abgeschlossen');
  const auftragSpaet = auftraege.some((x) => x.ende && x.ende < h);
  const auftragTeuer = auftraege.some((x) => zahl(x.angebot) && zahl(x.ist) > zahl(x.angebot));
  const erneuern = !gebucht('Erneuern') ? aus
    : auftragSpaet || auftragTeuer ? { zustand: 'kritisch' as Zustand, text: auftragSpaet ? 'Auftrag über Termin' : 'Kosten über Angebot' }
    : auftraege.length ? { zustand: 'achtung' as Zustand, text: `${auftraege.length} Auftrag/Aufträge laufen` }
    : { zustand: 'gut' as Zustand, text: 'Nichts offen' };

  // Entwickeln: Projekte
  const projekte = alle('projekte').filter((x) => x.objektId === objektId && x.phase !== 'Abgeschlossen');
  const projektTeuer = projekte.some((x) => zahl(x.budget) && zahl(x.ist) > zahl(x.budget));
  const projektSpaet = projekte.some((x) => x.ziel && x.ziel < h);
  const entwickeln = !gebucht('Entwickeln') ? aus
    : projektTeuer || projektSpaet ? { zustand: 'kritisch' as Zustand, text: projektTeuer ? 'Budget überschritten' : 'Projekt über Termin' }
    : projekte.length ? { zustand: 'achtung' as Zustand, text: `${projekte.length} Projekt(e) laufen` }
    : { zustand: 'gut' as Zustand, text: 'Nichts offen' };

  return { Verwalten: verwalten, Betreuen: betreuen, Erneuern: erneuern, Entwickeln: entwickeln };
}

/* ---------- Rechnungen an Kunden ---------- */
const dezimal = (x?: string) => zahl(String(x ?? '').replace(/\s|€/g, '').replace(',', '.'));
/** Positionen stehen zeilenweise im Format «Leistung | Menge | Einzelpreis». */
export function positionen(r: Satz) {
  return String(r.positionen ?? '').split('\n').map((z) => z.trim()).filter(Boolean).map((z) => {
    const [text, menge, einzel] = z.split('|').map((x) => x.trim());
    const m = menge === undefined || menge === '' ? 1 : dezimal(menge);
    const e = dezimal(einzel);
    return { text, menge: m, einzel: e, summe: Math.round(m * e * 100) / 100 };
  });
}
export function rechnungSumme(r: Satz) {
  const netto = Math.round(positionen(r).reduce((s, p) => s + p.summe, 0) * 100) / 100;
  const satz = zahl(r.ust);
  const ust = Math.round(netto * satz) / 100;
  return { netto, satz, ust, brutto: Math.round((netto + ust) * 100) / 100 };
}
export const rechnungUeberfaellig = (r: Satz) => r.status === 'Offen' && !!r.faellig && r.faellig < heute();

/** Nächster Termin eines wiederkehrenden Dienstes */
export function naechsterTermin(datum: string, rhythmus: string): string {
  const basis = datum < heute() ? heute() : datum;
  switch (rhythmus) {
    case 'Wöchentlich': return datumPlus(basis, 7);
    case '14-tägig': return datumPlus(basis, 14);
    case 'Monatlich': return datumPlusMonate(basis, 1);
    case 'Vierteljährlich': return datumPlusMonate(basis, 3);
    case 'Jährlich': return datumPlusMonate(basis, 12);
    default: return basis;
  }
}

/* ---------- Kaution ---------- */
export const kautionsbuchungen = (m: Satz) => alle('kautionsbuchungen').filter((b) => b.mieterId === m.id).sort((a, b) => String(a.datum).localeCompare(String(b.datum)));
const VORZEICHEN: Record<string, number> = { Eingang: 1, Zinsen: 1, Einbehalt: -1, 'Auszahlung an Mieter': -1 };
/** Eingezahlte Kaution (ohne Zinsen). Ältere Einträge ohne Buchungen: Feld „kautionIst“. */
export function kautionErhalten(m: Satz): number {
  const b = kautionsbuchungen(m);
  return b.length ? b.filter((x) => x.art === 'Eingang').reduce((s, x) => s + zahl(x.betrag), 0) : zahl(m.kautionIst);
}
/** Was aktuell für den Mieter verwahrt wird (Eingänge + Zinsen − Einbehalt − Auszahlung) */
export function kautionBestand(m: Satz): number {
  const b = kautionsbuchungen(m);
  return b.length ? b.reduce((s, x) => s + (VORZEICHEN[x.art] ?? 0) * zahl(x.betrag), 0) : zahl(m.kautionIst);
}

/* ---------- Stand eines Mietverhältnisses ---------- */
export type MietStand = 'Geplant' | 'Laufend' | 'Gekündigt' | 'Beendet';
export function mietStand(m: Satz): MietStand {
  const t = heute();
  if (m.ende && m.ende < t) return 'Beendet';
  if (m.beginn && m.beginn > t) return 'Geplant';
  if (m.ende) return 'Gekündigt';
  return 'Laufend';
}

/* ---------- Kündigungsfristen (§ 573c BGB) ---------- */
const iso = (d: Date) => d.toISOString().slice(0, 10);
function ostersonntag(j: number): Date {
  const a = j % 19, b = Math.floor(j / 100), c = j % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const hh = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - hh - k) % 7, m = Math.floor((a + 11 * hh + 22 * l) / 451);
  const monat = Math.floor((hh + l - 7 * m + 114) / 31), tag = ((hh + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(j, monat - 1, tag));
}
/** Gesetzliche Feiertage in Nordrhein-Westfalen */
export function feiertageNRW(j: number): Set<string> {
  const o = ostersonntag(j).getTime();
  const plus = (n: number) => iso(new Date(o + n * 86400000));
  return new Set([`${j}-01-01`, `${j}-05-01`, `${j}-10-03`, `${j}-11-01`, `${j}-12-25`, `${j}-12-26`, plus(-2), plus(1), plus(39), plus(50), plus(60)]);
}
/** Werktag im Sinne von § 573c BGB: Montag bis Freitag, kein Feiertag (der Samstag zählt nach BGH nicht mit). */
export function istWerktag(tag: string): boolean {
  const d = new Date(tag + 'T00:00:00Z');
  const wt = d.getUTCDay();
  return wt !== 0 && wt !== 6 && !feiertageNRW(d.getUTCFullYear()).has(tag);
}
const monatsletzter = (monat: string) => iso(new Date(Date.UTC(Number(monat.slice(0, 4)), Number(monat.slice(5, 7)), 0)));
/**
 * Mietende bei ordentlicher Kündigung: Zugang bis zum 3. Werktag eines Monats → Ende des übernächsten Monats.
 * Kündigt der Vermieter, verlängert sich die Frist nach 5 und 8 Jahren Mietdauer um je 3 Monate.
 */
export function kuendigungsEnde(eingang: string, durch: string, beginn?: string): { ende: string; text: string } | null {
  if (!eingang) return null;
  const monat = monatVon(eingang);
  let werktage = 0;
  for (let t = `${monat}-01`; t <= eingang; t = datumPlus(t, 1)) if (istWerktag(t)) werktage++;
  const rechtzeitig = werktage <= 3;
  let monate = 2;
  let jahre = 0;
  if (durch === 'Vermieter' && beginn) {
    jahre = (Date.parse(eingang) - Date.parse(beginn)) / (365.25 * 86400000);
    monate = jahre >= 8 ? 8 : jahre >= 5 ? 5 : 2;
  }
  const ende = monatsletzter(monatPlus(monat, monate + (rechtzeitig ? 0 : 1)));
  const frist = `${monate + 1} Monate`;
  return { ende, text: `${rechtzeitig ? `Zugang am ${werktage}. Werktag – rechtzeitig für diesen Monat` : `Zugang nach dem 3. Werktag (${werktage}.) – zählt erst ab dem Folgemonat`}; Frist ${frist}${durch === 'Vermieter' && beginn ? ` (Mietdauer ${Math.floor(jahre)} Jahre)` : ''}.` };
}
