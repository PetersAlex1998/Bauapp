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
export const soll = (m: Satz) => zahl(m.kaltmiete) + zahl(m.nebenkosten);
export const gezahlt = (m: Satz, monat?: string) =>
  alle('zahlungen').filter((z) => z.mieterId === m.id && (!monat || z.monat === monat)).reduce((s, z) => s + zahl(z.betrag), 0);

/** Offener Betrag eines Mietverhältnisses bis einschließlich des laufenden Monats. */
export function rueckstand(m: Satz): number {
  if (!m.beginn) return 0;
  const bis = m.ende && monatVon(m.ende) < monatHeute() ? monatVon(m.ende) : monatHeute();
  let monate = 0;
  for (let mo = monatVon(m.beginn); mo <= bis && monate < 600; mo = monatPlus(mo, 1)) monate++;
  return Math.max(0, Math.round((monate * soll(m) - gezahlt(m)) * 100) / 100);
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

  // Belegte Monate je Mietverhältnis im Abrechnungsjahr
  const mv = mieterVon(objektId)
    .map((m) => {
      let monate = 0;
      for (let i = 1; i <= 12; i++) if (aktivIm(m, `${jahr}-${String(i).padStart(2, '0')}`)) monate++;
      return { m, monate, einheit: finde('einheiten', m.einheitId)! };
    })
    .filter((x) => x.monate > 0 && x.einheit);

  const flaecheGesamt = einheiten.reduce((s, e) => s + zahl(e.flaeche), 0) * 12;
  const einheitenGesamt = einheiten.length * 12;
  const personenGesamt = mv.reduce((s, x) => s + Math.max(1, zahl(x.m.personen)) * x.monate, 0);

  const zeilen = mv.map(({ m, monate, einheit }) => {
    const posten = kostenarten.map((k) => {
      let anteil = 0;
      if (k.schluessel === 'Einheiten') anteil = einheitenGesamt ? monate / einheitenGesamt : 0;
      else if (k.schluessel === 'Personen') anteil = personenGesamt ? (Math.max(1, zahl(m.personen)) * monate) / personenGesamt : 0;
      else anteil = flaecheGesamt ? (zahl(einheit.flaeche) * monate) / flaecheGesamt : 0;
      return { art: k.art, schluessel: k.schluessel, betrag: Math.round(k.summe * anteil * 100) / 100 };
    });
    const summe = Math.round(posten.reduce((s, p) => s + p.betrag, 0) * 100) / 100;
    const voraus = Math.round(zahl(m.nebenkosten) * monate * 100) / 100;
    return { mieter: m, einheit, monate, posten, summe, voraus, saldo: Math.round((summe - voraus) * 100) / 100 };
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
