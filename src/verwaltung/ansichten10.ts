/**
 * MIETVERHÄLTNIS – vom Einzug bis zum Auszug an einem Ort
 * ---------------------------------------------------------------
 *  • Akte (#/mietverhaeltnis/<id>): Stand, Einzugs-Checkliste, Miete, Zahlungen,
 *    Kaution mit Buchungen und Kautionskonto, Dokumente.
 *  • Mietvertrag über Wohnraum aus den Daten (#/mietvertrag/<id>)
 *  • Wohnungsgeberbestätigung nach § 19 BMG (#/wohnungsgeber/<id>/<einzug|auszug>)
 *  • Kautionsbestätigung und Kautionsabrechnung (#/kautionsbrief/<id>/<bestaetigung|abrechnung>)
 * Alle Schreiben im DIN-5008-Briefbogen.
 */
import { alle, finde, heute, speichere, type Satz } from './speicher';
import { datumPlus, datumPlusMonate, kuendigungsEnde, kautionBestand, kautionErhalten, kautionsbuchungen, mietStand, mieteAm, monatHeute, monatVon, rueckstand, soll, verlaufVon, zahl, type MietStand } from './rechnen';
import { aktionen, datum, formular, geld, h, hinweis, kennzahl, liste, marke, monatText, routen, zeichne } from './app';
import { absender, bogen, briefInfo, gruss, mietkonto, werkzeug } from './ansichten2';

/* ---------- Bausteine ---------- */
type Kontext = { m: Satz; einheit: Satz; objekt: Satz; kunde?: Satz };
function kontext(id?: string): Kontext | null {
  const m = finde('mieter', id);
  const einheit = m && finde('einheiten', m.einheitId);
  const objekt = einheit && finde('objekte', einheit.objektId);
  return m && einheit && objekt ? { m, einheit, objekt, kunde: finde('kunden', objekt.kundeId) } : null;
}
const fehlt = () => h('p', { class: 'vw-leer' }, 'Dieses Mietverhältnis gibt es nicht mehr. ', h('a', { href: '#/mieten' }, 'Zu den Mieten'));

export const STAND_FARBE: Record<MietStand, string> = { Geplant: 'blau', Laufend: 'gruen', Gekündigt: 'gelb', Beendet: 'grau' };
export function standMarke(m: Satz) {
  const st = mietStand(m);
  const text = st === 'Geplant' ? `Einzug ${datum(m.beginn)}` : st === 'Gekündigt' ? `Auszug ${datum(m.ende)}` : st === 'Beendet' ? `Beendet ${datum(m.ende)}` : 'Laufend';
  return marke(text, STAND_FARBE[st]);
}

/** Alle Mieter eines Vertrags als Liste */
/** „die Wohnung 3 (1. OG links)“ ohne doppeltes „Wohnung“ */
export const wohnungText = (e: Satz) => `${/^wohnung/i.test(e.bezeichnung ?? '') ? 'die' : 'die Wohnung'} ${e.bezeichnung}${e.lage ? ` (${e.lage})` : ''}`;
const personen = (m: Satz) => [m.name, ...String(m.name2 ?? '').split(',')].map((x) => String(x ?? '').trim()).filter(Boolean);
const nachname = (name: string) => name.trim().split(/\s+/).pop() ?? name;

/** Anrede für den Brief */
export function anredeZeile(m: Satz): string {
  if (m.anrede === 'Herr') return `Sehr geehrter Herr ${nachname(m.name)},`;
  if (m.anrede === 'Frau') return `Sehr geehrte Frau ${nachname(m.name)},`;
  if (m.anrede === 'Familie') return `Sehr geehrte Familie ${nachname(m.name)},`;
  return 'Sehr geehrte Damen und Herren,';
}

/** Anschrift im Fenster: vor dem Einzug die bisherige Anschrift, sonst die Mietwohnung */
export function anschriftMieter({ m, objekt }: Kontext): string[] {
  const namen = personen(m);
  const kopf = m.anrede === 'Familie' ? [`Familie ${nachname(m.name)}`] : m.anrede === 'Herr' || m.anrede === 'Frau' ? [`${m.anrede} ${namen[0]}`, ...namen.slice(1, 2)] : namen.slice(0, 2);
  const bisher = String(m.anschriftBisher ?? '').split(/\n|,\s*(?=\d{5})/).map((x) => x.trim()).filter(Boolean);
  const neu = String(m.anschriftNeu ?? '').split(/\n|,\s*(?=\d{5})/).map((x) => x.trim()).filter(Boolean);
  const vorEinzug = m.beginn && m.beginn > heute() && bisher.length;
  const nachAuszug = m.ende && m.ende < heute() && neu.length;
  return [...kopf, ...(nachAuszug ? neu : vorEinzug ? bisher : [objekt.strasse || objekt.bezeichnung, objekt.ort])].slice(0, 6);
}

const kautionskonto = (m: Satz) => finde('bankkonten', m.kautionKontoId) ?? alle('bankkonten').find((k) => k.zweck === 'Kautionen');
const standardKautionskonto = () => alle('bankkonten').find((k) => k.zweck === 'Kautionen')?.id ?? '';

/** Neuvermietung: Formular, danach direkt in die Akte mit Checkliste */
export function neuvermietung(einheitId: string) {
  formular('mieter', { einheitId, kautionKontoId: standardKautionskonto() }, (s) => {
    location.hash = `#/mietverhaeltnis/${s.id}`;
    if (s.beginn > heute()) hinweis(`Gespeichert – das Mietverhältnis beginnt am ${datum(s.beginn)} und steht bis dahin als „Einzug geplant“ bei der Einheit.`);
  });
}
aktionen.neuvermietung = (e: Satz) => neuvermietung(e.id);

export function kautionBuchen(m: Satz, art = 'Eingang', vorgabe: Partial<Satz> = {}) {
  const offen = Math.max(0, zahl(m.kautionSoll) - kautionErhalten(m));
  formular('kautionsbuchungen', { mieterId: m.id, art, datum: heute(), kontoId: m.kautionKontoId || standardKautionskonto(), betrag: art === 'Eingang' && offen ? Math.round(offen * 100) / 100 : '', ...vorgabe });
}

/* ---------- Einzugs-Checkliste ---------- */
type Schritt = { key: string; text: string; hilfe: string; fertig: boolean; auto?: boolean; tun?: Node | false };
function schritte(k: Kontext): Schritt[] {
  const { m } = k;
  const s: Record<string, string> = m.schritte ?? {};
  const keineKaution = m.kautionArt === 'Keine Kaution' || !zahl(m.kautionSoll);
  const link = (href: string, text: string) => h('a', { class: 'vw-knopf vw-knopf--klein', href }, text);
  return [
    { key: 'vertrag', text: 'Mietvertrag erstellt und unterschrieben', hilfe: m.vertragsdatum ? `Unterschrieben am ${datum(m.vertragsdatum)}` : 'Vertragsmappe drucken (Vertrag, Hausordnung, Datenschutz, Einzugsformular …), unterschreiben lassen, Datum eintragen.', fertig: !!m.vertragsdatum, auto: true, tun: link(`#/vertragsmappe/${m.id}`, 'Vertragsmappe') },
    { key: 'unterlagen', text: 'Hausordnung und Datenschutzinformation unterschrieben', hilfe: 'Gehören zum Vertrag; unterschrieben zur Akte nehmen.', fertig: !!s.unterlagen, tun: link(`#/hausordnung/${m.id}`, 'Hausordnung') },
    { key: 'einzugsformular', text: 'Einzugsformular ausgefüllt', hilfe: m.einzug?.ausgefuellt ? `Erfasst am ${datum(m.einzug.ausgefuellt)}${m.einzug.zahlweise ? ` · ${m.einzug.zahlweise}` : ''}` : 'Haushalt, Klingelschild, Bankverbindung, Zahlweise.', fertig: !!m.einzug?.ausgefuellt, auto: true, tun: link(`#/einzugsformular/${m.id}`, 'Formular') },
    { key: 'kaution', text: 'Kaution erhalten', hilfe: keineKaution ? 'Keine Kaution vereinbart.' : `${geld(kautionErhalten(m))} von ${geld(m.kautionSoll)} eingegangen`, fertig: keineKaution || kautionErhalten(m) >= zahl(m.kautionSoll), auto: true, tun: !keineKaution && h('button', { class: 'vw-knopf vw-knopf--klein', onclick: () => kautionBuchen(m) }, 'Eingang buchen') },
    { key: 'energieausweis', text: 'Energieausweis übergeben', hilfe: 'Pflicht bei Vertragsschluss (§ 80 Abs. 4 GEG), spätestens beim Abschluss.', fertig: !!s.energieausweis },
    { key: 'uebergabe', text: 'Wohnung übergeben mit Protokoll', hilfe: 'Am Handy vor Ort: Räume, Fotos, Zähler, Schlüssel, Unterschriften.', fertig: !!s.uebergabe, tun: link(`#/uebergabe/${m.id}/einzug`, 'Protokoll') },
    { key: 'zaehler', text: 'Zählerstände zum Einzug erfasst', hilfe: 'Wird mit dem Protokoll übernommen.', fertig: !!s.zaehler },
    { key: 'wgb', text: 'Wohnungsgeberbestätigung ausgestellt', hilfe: 'Der Mieter braucht sie für die Anmeldung innerhalb von zwei Wochen (§ 17, § 19 BMG).', fertig: !!s.wgb, tun: link(`#/wohnungsgeber/${m.id}/einzug`, 'Bestätigung') },
    { key: 'versorger', text: 'Versorger informiert (Strom, ggf. Gas)', hilfe: 'Mieterwechsel mit Zählerstand melden.', fertig: !!s.versorger },
  ];
}
function auszugSchritte(k: Kontext): Schritt[] {
  const { m } = k;
  const s: Record<string, string> = m.schritte ?? {};
  const link = (href: string, text: string) => h('a', { class: 'vw-knopf vw-knopf--klein', href }, text);
  const b = kautionsbuchungen(m);
  const kautionFertig = (!zahl(m.kautionSoll) && !b.length && !zahl(m.kautionIst)) || (b.length > 0 && Math.abs(kautionBestand(m)) < 0.005);
  return [
    { key: 'kuendigungBestaetigt', text: 'Kündigung schriftlich bestätigt', hilfe: m.kuendigungEingang ? `Eingang ${datum(m.kuendigungEingang)} · Mietende ${datum(m.ende)}` : 'Eingang und Mietende festhalten.', fertig: !!s.kuendigungBestaetigt, tun: m.kuendigungDurch !== 'Vermieter' && link(`#/kuendigung/${m.id}`, 'Bestätigung') },
    { key: 'anschriftNeu', text: 'Neue Anschrift erfasst', hilfe: m.anschriftNeu ? String(m.anschriftNeu).replace(/\n+/g, ', ') : 'Für Kautions- und Nebenkostenabrechnung.', fertig: !!m.anschriftNeu, auto: true, tun: !m.anschriftNeu && h('button', { class: 'vw-knopf vw-knopf--klein', onclick: () => formular('mieter', m) }, 'Eintragen') },
    { key: 'abnahmetermin', text: 'Abnahmetermin vereinbart', hilfe: 'Möglichst am letzten Tag des Mietverhältnisses.', fertig: !!s.abnahmetermin },
    { key: 'auszugUebergabe', text: 'Wohnung abgenommen mit Protokoll', hilfe: 'Vergleich mit dem Einzugsprotokoll, Fotos von Mängeln.', fertig: !!s.auszugUebergabe, tun: link(`#/uebergabe/${m.id}/auszug`, 'Protokoll') },
    { key: 'auszugZaehler', text: 'Zählerstände zum Auszug erfasst', hilfe: 'Wird mit dem Protokoll übernommen; Versorger informieren.', fertig: !!s.auszugZaehler },
    { key: 'schluesselZurueck', text: 'Alle Schlüssel zurückerhalten', hilfe: m.schluessel ? `Übergeben waren: ${m.schluessel}` : 'Anzahl mit dem Einzug vergleichen.', fertig: !!s.schluesselZurueck },
    { key: 'wgbAuszug', text: 'Wohnungsgeberbestätigung Auszug (falls nötig)', hilfe: 'Nur nötig, wenn sich der Mieter abmelden muss – z. B. bei Wegzug ins Ausland.', fertig: !!s.wgbAuszug, tun: link(`#/wohnungsgeber/${m.id}/auszug`, 'Bestätigung') },
    { key: 'nkAuszug', text: 'Nebenkosten bis zum Auszug abgerechnet', hilfe: 'Mit der nächsten Jahresabrechnung (anteilig nach Nutzungszeit).', fertig: !!s.nkAuszug },
    { key: 'kaution', text: 'Kaution abgerechnet und ausgezahlt', hilfe: kautionFertig ? 'Erledigt.' : `Noch verwahrt: ${geld(kautionBestand(m))}`, fertig: kautionFertig, auto: true, tun: !kautionFertig && link(`#/kautionsbrief/${m.id}/abrechnung`, 'Abrechnung') },
  ];
}
function checkliste(k: Kontext, auszug = false): HTMLElement {
  const liste_ = auszug ? auszugSchritte(k) : schritte(k);
  const fertig = liste_.filter((x) => x.fertig).length;
  const umschalten = (key: string, an: boolean) => {
    const neu = { ...(k.m.schritte ?? {}) };
    if (an) neu[key] = heute(); else delete neu[key];
    speichere('mieter', { id: k.m.id, schritte: neu });
    zeichne();
  };
  return h('section', { class: 'vw-karte' },
    h('header', { class: 'vw-karte__kopf' }, h('h2', {}, auszug ? 'Auszug' : 'Einzug'), h('span', {}, `${fertig} von ${liste_.length} erledigt`)),
    h('ul', { class: 'vw-schritte' }, liste_.map((x) => h('li', { class: x.fertig ? 'ist-fertig' : '' },
      x.auto
        ? h('span', { class: 'vw-schritte__haken', 'aria-hidden': 'true' }, x.fertig ? '✓' : '')
        : h('input', { type: 'checkbox', checked: x.fertig, 'aria-label': x.text, onchange: (e: Event) => umschalten(x.key, (e.target as HTMLInputElement).checked) }),
      h('div', {}, h('strong', {}, x.text), h('small', { class: 'vw-block' }, x.hilfe, !x.auto && k.m.schritte?.[x.key] ? ` · erledigt am ${datum(k.m.schritte[x.key])}` : '')),
      x.tun || null))),
    !auszug && !k.m.vertragsdatum && h('p', { class: 'vw-innen' }, h('button', { class: 'vw-knopf vw-knopf--klein', onclick: () => { speichere('mieter', { id: k.m.id, vertragsdatum: heute() }); hinweis('Vertrag als heute unterschrieben eingetragen'); zeichne(); } }, 'Vertrag heute unterschrieben')));
}

/* ---------- Kaution ---------- */
function kautionKarte(k: Kontext): HTMLElement {
  const { m } = k;
  const b = kautionsbuchungen(m);
  const konto = kautionskonto(m);
  const vereinbart = zahl(m.kautionSoll);
  const erhalten = kautionErhalten(m);
  const maximal = 3 * zahl(m.kaltmiete);
  const hinweise: Node[] = [];
  if (vereinbart > maximal + 0.005 && maximal > 0) hinweise.push(h('p', { class: 'vw-warnung' }, `Die vereinbarte Kaution (${geld(vereinbart)}) liegt über drei Kaltmieten (${geld(maximal)}). Mehr ist nach § 551 Abs. 1 BGB nicht zulässig.`));
  if (vereinbart && m.kautionArt !== 'Keine Kaution' && m.kautionArt !== 'Bürgschaft' && !konto) hinweise.push(h('p', { class: 'vw-warnung' }, 'Kein Kautionskonto gewählt. Die Kaution muss getrennt vom eigenen Vermögen angelegt werden (§ 551 Abs. 3 BGB). Konto anlegen unter Administration → Unternehmen (Verwendung „Kautionen“).'));
  const raten = vereinbart && erhalten < vereinbart && m.beginn && m.kautionArt !== 'Keine Kaution'
    ? h('p', { class: 'vw-fein vw-innen' }, `Der Mieter darf in drei gleichen Monatsraten zahlen (§ 551 Abs. 2 BGB): je ${geld(vereinbart / 3)} – zu Beginn (${datum(m.beginn)}), mit der Miete für ${monatText(monatVon(datumPlusMonate(m.beginn, 1)))} und für ${monatText(monatVon(datumPlusMonate(m.beginn, 2)))}.`)
    : null;
  const beendet = mietStand(m) === 'Beendet' || (m.ende && m.ende <= heute());
  return h('section', { class: 'vw-karte' },
    h('header', { class: 'vw-karte__kopf' }, h('h2', {}, 'Kaution'),
      h('button', { class: 'vw-knopf vw-knopf--voll', onclick: () => kautionBuchen(m) }, '+ Buchung')),
    h('dl', { class: 'vw-info vw-info--innen' },
      h('dt', {}, 'Vereinbart'), h('dd', {}, vereinbart ? `${geld(vereinbart)} · ${m.kautionArt || 'Art offen'}` : 'Keine Kaution eingetragen'),
      h('dt', {}, 'Kautionskonto'), h('dd', {}, konto ? `${konto.bezeichnung} · ${konto.iban}${konto.bank ? ` · ${konto.bank}` : ''}` : '–'),
      h('dt', {}, 'Eingezahlt'), h('dd', {}, h('strong', {}, geld(erhalten)), vereinbart > erhalten ? ` – noch ${geld(vereinbart - erhalten)} offen` : ''),
      h('dt', {}, 'Verwahrt (mit Zinsen)'), h('dd', {}, geld(kautionBestand(m)))),
    ...hinweise, raten,
    h('div', { class: 'vw-tabelle' }, h('table', {},
      h('thead', {}, h('tr', {}, ['Datum', 'Buchung', 'Betrag', 'Konto', 'Notiz'].map((t) => h('th', { scope: 'col' }, t)))),
      h('tbody', {}, b.length ? b.map((x) => h('tr', { tabindex: 0, onclick: () => formular('kautionsbuchungen', x) },
        h('td', { 'data-spalte': 'Datum' }, datum(x.datum)), h('td', { 'data-spalte': 'Buchung' }, x.art),
        h('td', { 'data-spalte': 'Betrag', class: 'vw-zahlspalte' }, `${x.art === 'Einbehalt' || x.art === 'Auszahlung an Mieter' ? '− ' : ''}${geld(x.betrag)}`),
        h('td', { 'data-spalte': 'Konto' }, finde('bankkonten', x.kontoId)?.bezeichnung ?? '–'), h('td', { 'data-spalte': 'Notiz' }, x.notiz || '')))
        : [h('tr', {}, h('td', { colspan: 5, class: 'vw-leer' }, zahl(m.kautionIst) ? `Bisher nur als Summe erfasst: ${geld(m.kautionIst)}. Neue Eingänge bitte als Buchung erfassen.` : 'Noch keine Buchung. Ein Eingang wird hier mit Datum und Konto dokumentiert.'))]))),
    h('div', { class: 'vw-reihe vw-innen' },
      erhalten > 0 && h('a', { class: 'vw-knopf vw-knopf--klein', href: `#/kautionsbrief/${m.id}/bestaetigung` }, 'Empfangsbestätigung'),
      h('button', { class: 'vw-knopf vw-knopf--klein', onclick: () => kautionBuchen(m, 'Zinsen', { betrag: '' }) }, 'Zinsen buchen'),
      beendet && [h('button', { class: 'vw-knopf vw-knopf--klein', onclick: () => kautionBuchen(m, 'Einbehalt', { betrag: '' }) }, 'Einbehalt buchen'),
        h('button', { class: 'vw-knopf vw-knopf--klein', onclick: () => kautionBuchen(m, 'Auszahlung an Mieter', { betrag: Math.max(0, kautionBestand(m)) }) }, 'Auszahlung buchen'),
        h('a', { class: 'vw-knopf vw-knopf--klein', href: `#/kautionsbrief/${m.id}/abrechnung` }, 'Kautionsabrechnung')]));
}

/* ---------- Akte ---------- */
routen.mietverhaeltnis = (id) => {
  const k = kontext(id);
  if (!k) return fehlt();
  const { m, einheit, objekt } = k;
  const st = mietStand(m);
  const verlauf = verlaufVon(m);
  const zahlungen = alle('zahlungen').filter((z) => z.mieterId === m.id).sort((a, b) => String(b.datum).localeCompare(String(a.datum))).slice(0, 12);
  const offen = rueckstand(m);
  const monate = m.beginn && m.beginn <= heute() ? Math.max(0, (Number(heute().slice(0, 4)) - Number(m.beginn.slice(0, 4))) * 12 + Number(heute().slice(5, 7)) - Number(m.beginn.slice(5, 7))) : 0;
  const dauer = st === 'Geplant' ? `ab ${datum(m.beginn)}` : monate >= 12 ? `${Math.floor(monate / 12)} J. ${monate % 12} M.` : `${monate} Monate`;
  const imAuszug = st === 'Gekündigt' || st === 'Beendet';
  const auszugOffen = imAuszug && auszugSchritte(k).some((x) => !x.fertig);
  const einzugOffen = !imAuszug && (st === 'Geplant' || schritte(k).some((x) => !x.fertig));
  const listeOffen = einzugOffen || auszugOffen;
  return h('div', { class: 'vw-stapel' },
    h('header', { class: 'vw-seitenkopf' },
      h('p', { class: 'vw-pfad' }, h('a', { href: '#/liste/objekte' }, 'Objekte'), ' / ', h('a', { href: `#/objekt/${objekt.id}` }, objekt.bezeichnung), ' / ', einheit.bezeichnung),
      h('h1', {}, personen(m).join(', ')),
      h('p', {}, `${einheit.bezeichnung}${einheit.lage ? ` (${einheit.lage})` : ''} · ${einheit.flaeche ? `${einheit.flaeche} m² · ` : ''}`, standMarke(m)),
      h('div', { class: 'vw-reihe' },
        h('button', { class: 'vw-knopf', onclick: () => formular('mieter', m) }, 'Bearbeiten'),
        h('a', { class: 'vw-knopf', href: `#/vertragsmappe/${m.id}` }, 'Vertragsunterlagen'),
        h('a', { class: 'vw-knopf', href: `#/wohnungsgeber/${m.id}/${st === 'Beendet' || st === 'Gekündigt' ? 'auszug' : 'einzug'}` }, 'Wohnungsgeberbestätigung'),
        h('a', { class: 'vw-knopf', href: `#/uebergabe/${m.id}/${imAuszug ? 'auszug' : 'einzug'}` }, 'Übergabeprotokoll'),
        m.kuendigungEingang && m.kuendigungDurch !== 'Vermieter' && h('a', { class: 'vw-knopf', href: `#/kuendigung/${m.id}` }, 'Kündigungsbestätigung'),
        offen > 0 && h('a', { class: 'vw-knopf', href: `#/brief/erinnerung/${m.id}` }, 'Zahlungserinnerung'),
        m.mietart === 'Indexmiete' && st === 'Laufend' && h('a', { class: 'vw-knopf', href: `#/indexmiete/${m.id}` }, 'Indexanpassung'),
        st === 'Laufend' && h('button', { class: 'vw-knopf', onclick: () => aktionen.mieterwechsel?.(m) }, 'Auszug …'))),
    h('div', { class: 'vw-kennzahlen' },
      kennzahl(geld(st === 'Geplant' ? mieteAm(m, m.beginn) + zahl(m.nebenkosten) : soll(m)), 'Miete gesamt im Monat'),
      kennzahl(geld(offen), 'Rückstand', undefined, offen > 0 ? 'vw-kennzahl--rot' : ''),
      kennzahl(geld(kautionBestand(m)), `Kaution verwahrt${zahl(m.kautionSoll) ? ` von ${geld(m.kautionSoll)}` : ''}`, undefined, kautionErhalten(m) < zahl(m.kautionSoll) ? 'vw-kennzahl--gelb' : ''),
      kennzahl(dauer, 'Mietdauer')),
    h('div', { class: 'vw-zwei' },
      listeOffen ? checkliste(k, imAuszug) : kautionKarte(k),
      h('section', { class: 'vw-karte' },
        h('header', { class: 'vw-karte__kopf' }, h('h2', {}, 'Vertrag')),
        h('dl', { class: 'vw-info vw-info--innen' },
          h('dt', {}, 'Mieter'), h('dd', {}, personen(m).join(', ')),
          h('dt', {}, 'Kontakt'), h('dd', {}, [m.telefon, m.email].filter(Boolean).join(' · ') || '–'),
          h('dt', {}, 'Mietbeginn'), h('dd', {}, datum(m.beginn)),
          m.ende && [h('dt', {}, 'Mietende'), h('dd', {}, datum(m.ende), m.kuendigungDurch ? ` · Kündigung durch ${m.kuendigungDurch}${m.kuendigungEingang ? ` (Eingang ${datum(m.kuendigungEingang)})` : ''}` : '')],
          m.anschriftNeu && [h('dt', {}, 'Neue Anschrift'), h('dd', {}, String(m.anschriftNeu).replace(/\n+/g, ', '))],
          h('dt', {}, 'Kaltmiete'), h('dd', {}, `${geld(mieteAm(m, st === 'Geplant' ? m.beginn : heute()))}${m.mietart && m.mietart !== 'Normale Miete' ? ` · ${m.mietart}` : ''}`),
          h('dt', {}, 'Vorauszahlung'), h('dd', {}, geld(m.nebenkosten)),
          h('dt', {}, 'Personen'), h('dd', {}, String(m.personen ?? '–')),
          m.mitvermietet && [h('dt', {}, 'Mitvermietet'), h('dd', {}, m.mitvermietet)],
          h('dt', {}, 'Unterschrieben'), h('dd', {}, m.vertragsdatum ? datum(m.vertragsdatum) : 'noch nicht'),
          m.schluessel && [h('dt', {}, 'Schlüssel'), h('dd', {}, m.schluessel)]),
        verlauf.length ? h('div', { class: 'vw-innen' }, h('h3', {}, 'Mietentwicklung'),
          h('ul', { class: 'vw-fein' }, verlauf.map((v) => h('li', { class: v.ab > heute() ? 'vw-kuenftig' : '' }, `ab ${datum(v.ab)}: ${geld(v.alt)} → ${geld(v.kaltmiete)} (${v.grund}${v.automatisch ? ', laut Vertrag' : ''})${v.ab > heute() ? ' – kommt noch' : ''}`)))) : null)),
    listeOffen ? kautionKarte(k) : null,
    imAuszug && !auszugOffen && h('details', { class: 'vw-karte vw-innen' }, h('summary', {}, 'Auszug – alle Schritte erledigt'), checkliste(k, true)),
    h('section', { class: 'vw-karte' },
      h('header', { class: 'vw-karte__kopf' }, h('h2', {}, 'Zahlungen'),
        h('button', { class: 'vw-knopf vw-knopf--voll', onclick: () => formular('zahlungen', { mieterId: m.id, monat: monatHeute(), betrag: soll(m), datum: heute() }) }, '+ Zahlung')),
      h('div', { class: 'vw-tabelle' }, h('table', {},
        h('thead', {}, h('tr', {}, ['Eingang', 'Für Monat', 'Betrag', 'Notiz'].map((t) => h('th', { scope: 'col' }, t)))),
        h('tbody', {}, zahlungen.length ? zahlungen.map((z) => h('tr', { tabindex: 0, onclick: () => formular('zahlungen', z) },
          h('td', { 'data-spalte': 'Eingang' }, datum(z.datum)), h('td', { 'data-spalte': 'Für Monat' }, monatText(z.monat)),
          h('td', { 'data-spalte': 'Betrag', class: 'vw-zahlspalte' }, geld(z.betrag)), h('td', { 'data-spalte': 'Notiz' }, z.notiz || '')))
          : [h('tr', {}, h('td', { colspan: 4, class: 'vw-leer' }, 'Noch keine Zahlungen gebucht.'))])))),
    alle('uebergaben').some((u) => u.mieterId === m.id) && h('section', { class: 'vw-karte' },
      h('header', { class: 'vw-karte__kopf' }, h('h2', {}, 'Übergabeprotokolle')),
      h('ul', { class: 'vw-innen vw-liste-schlicht' }, alle('uebergaben').filter((u) => u.mieterId === m.id).map((u) => h('li', {},
        h('a', { href: `#/uebergabedruck/${u.id}` }, `${u.art} am ${datum(u.datum)}`),
        ` · ${(u.raeume ?? []).filter((r: any) => r.ok === false).length} Räume mit Mängeln · ${(u.raeume ?? []).reduce((n: number, r: any) => n + (r.fotos?.length ?? 0), 0)} Fotos · ${u.abgeschlossen ? 'abgeschlossen' : 'in Arbeit'}`)))),
    liste('dokumente', { filter: (s) => s.mieterId === m.id, vorgaben: { objektId: objekt.id, mieterId: m.id, datum: heute(), art: 'Mietvertrag' }, ohneSpalte: 'objektId', titel: 'Dokumente zu diesem Mietverhältnis', kompakt: true }),
    m.notiz && h('section', { class: 'vw-karte vw-text' }, h('h2', {}, 'Interne Notiz'), h('p', {}, m.notiz)));
};

/* ---------- Mietvertrag ---------- */
const absatz = (titel: string, ...text: (Node | string | false | null | undefined)[]) => [h('h3', { class: 'din__para' }, titel), ...text.filter(Boolean).map((t) => (typeof t === 'string' ? h('p', {}, t) : t))];

routen.mietvertrag = (id) => {
  const k = kontext(id);
  if (!k) return fehlt();
  const { m, einheit, objekt, kunde } = k;
  const a = absender();
  const mk = mietkonto(objekt.id);
  const kalt = mieteAm(m, m.beginn || heute());
  const vz = zahl(m.nebenkosten);
  const kaution = zahl(m.kautionSoll);
  const konto = kautionskonto(m);
  const warnungen = [
    !kunde && 'Dem Objekt ist kein Kunde (Eigentümer) zugeordnet – er ist der Vermieter.',
    kunde && !(kunde.strasse && kunde.ort) && 'Beim Kunden (Vermieter) fehlt die Anschrift.',
    einheit.art === 'Gewerbe' && 'Diese Vorlage ist für Wohnraum. Für Gewerbeflächen bitte einen Gewerbemietvertrag verwenden.',
    !einheit.flaeche && 'Bei der Einheit fehlt die Wohnfläche.',
    !mk && 'Für das Objekt ist kein Mietkonto hinterlegt (Objekt → Finanzen).',
    m.mietart === 'Staffelmiete' && !String(m.staffeln ?? '').trim() && 'Staffelmiete gewählt, aber keine Staffeln eingetragen (Datum und Betrag je Staffel, § 557a BGB).',
    kaution > 3 * kalt + 0.005 && `Die Kaution übersteigt drei Kaltmieten (${geld(3 * kalt)}), § 551 BGB.`,
    !m.anschriftBisher && m.beginn > heute() && 'Bisherige Anschrift des Mieters fehlt (für die Anschrift im Brieffenster).',
  ].filter(Boolean) as string[];
  const vermieter = kunde ? [kunde.name, kunde.strasse, kunde.ort].filter(Boolean).join(', ') : '______________________________';
  const verwalter = [a.name, a.strasse, a.ort].filter(Boolean).join(', ');
  const mieterText = personen(m).join(', ');
  const lage = [objekt.strasse, objekt.ort].filter(Boolean).join(', ') || objekt.bezeichnung;
  const unterschriften = h('div', { class: 'vw-brief__sign din__sign' },
    h('span', {}, 'Ort, Datum'), h('span', {}, `Vermieter, vertreten durch ${a.name ?? 'die Verwaltung'}`),
    ...personen(m).flatMap((p) => [h('span', {}, 'Ort, Datum'), h('span', {}, `Mieter: ${p}`)]));
  return h('div', { class: 'vw-stapel' },
    werkzeug(`#/mietverhaeltnis/${m.id}`, h('button', { class: 'vw-knopf', onclick: () => formular('mieter', m) }, 'Daten ergänzen')),
    h('p', { class: 'vw-fein vw-nichtdrucken' }, 'Vorlage aus den Daten des Mietverhältnisses. Lassen Sie das Muster einmal juristisch prüfen, bevor Sie es zum ersten Mal verwenden; danach bleibt es für jede Vermietung gleich.'),
    ...warnungen.map((w) => h('p', { class: 'vw-warnung vw-nichtdrucken' }, w)),
    bogen(anschriftMieter(k), 'Mietvertrag über Wohnraum',
      briefInfo(['Objekt', objekt.bezeichnung], ['Einheit', einheit.bezeichnung], ['Mietbeginn', datum(m.beginn)]),
      h('p', {}, h('strong', {}, 'Vermieter: '), vermieter, `, vertreten durch die Hausverwaltung ${verwalter}`),
      h('p', {}, h('strong', {}, 'Mieter: '), mieterText, m.anschriftBisher ? `, bisher wohnhaft ${String(m.anschriftBisher).replace(/\n+/g, ', ')}` : ''),
      ...absatz('§ 1 Mietsache',
        `Vermietet wird ${/^wohnung/i.test(einheit.bezeichnung ?? '') ? 'die' : 'die Wohnung'} ${einheit.bezeichnung}${einheit.lage ? ` (${einheit.lage})` : ''} im Haus ${lage}${einheit.zimmer ? ` mit ${einheit.zimmer} Zimmern` : ''}${einheit.flaeche ? `, Wohnfläche ca. ${einheit.flaeche} m²` : ''}.`,
        m.mitvermietet && `Mitvermietet sind: ${m.mitvermietet}.`,
        'Gemeinschaftseinrichtungen (z. B. Treppenhaus, Hof, Waschraum) dürfen im Rahmen der Hausordnung mitbenutzt werden.'),
      ...absatz('§ 2 Mietzeit',
        `Das Mietverhältnis beginnt am ${datum(m.beginn)} und läuft auf unbestimmte Zeit.`,
        'Es kann nach den gesetzlichen Vorschriften gekündigt werden (§§ 573, 573c BGB). Die Kündigung bedarf der Schriftform (§ 568 BGB). Eine stillschweigende Verlängerung nach § 545 BGB ist ausgeschlossen.'),
      ...absatz('§ 3 Miete und Betriebskosten',
        h('table', { class: 'vw-brief__tabelle' }, h('tbody', {},
          h('tr', {}, h('td', {}, 'Grundmiete (kalt)'), h('td', { class: 'vw-zahlspalte' }, geld(kalt))),
          h('tr', {}, h('td', {}, 'Vorauszahlung Betriebs- und Heizkosten'), h('td', { class: 'vw-zahlspalte' }, geld(vz))),
          h('tr', { class: 'vw-summe' }, h('td', {}, h('strong', {}, 'Monatliche Gesamtmiete')), h('td', { class: 'vw-zahlspalte' }, h('strong', {}, geld(kalt + vz)))))),
        'Der Mieter trägt die Betriebskosten im Sinne der Betriebskostenverordnung (BetrKV) einschließlich Heizung und Warmwasser. Über die Vorauszahlungen wird jährlich abgerechnet (§ 556 Abs. 3 BGB). Verteilt wird nach Wohnfläche, soweit nicht nach Verbrauch oder Verursachung abgerechnet wird; Heiz- und Warmwasserkosten nach der Heizkostenverordnung. Nach einer Abrechnung kann jede Partei die Vorauszahlungen angemessen anpassen (§ 560 Abs. 4 BGB).',
        m.mietart === 'Staffelmiete' && h('div', {}, h('p', {}, 'Staffelmiete (§ 557a BGB): Die Grundmiete erhöht sich wie folgt; jede Staffel gilt mindestens ein Jahr. Eine Erhöhung nach §§ 558 bis 559b BGB ist während der Laufzeit ausgeschlossen.'),
          h('ul', {}, String(m.staffeln ?? '').split('\n').map((z) => z.trim()).filter(Boolean).map((z) => h('li', {}, z)))),
        m.mietart === 'Indexmiete' && 'Indexmiete (§ 557b BGB): Die Grundmiete ändert sich entsprechend dem vom Statistischen Bundesamt ermittelten Verbraucherpreisindex für Deutschland. Sie muss jeweils mindestens ein Jahr unverändert bleiben; eine Änderung ist in Textform zu erklären und gilt ab dem übernächsten Monat. Erhöhungen nach § 558 BGB sind ausgeschlossen.'),
      ...absatz('§ 4 Zahlung',
        `Die Gesamtmiete ist monatlich im Voraus, spätestens bis zum dritten Werktag eines Monats zu zahlen (§ 556b Abs. 1 BGB)${mk ? `, auf das Konto ${mk.inhaber ? `${mk.inhaber}, ` : ''}IBAN ${mk.iban}${mk.bank ? ` (${mk.bank})` : ''}` : ' auf das vom Vermieter benannte Konto'}. Für die Rechtzeitigkeit kommt es auf die Erteilung des Zahlungsauftrags an.`),
      ...absatz('§ 5 Mietsicherheit',
        kaution && m.kautionArt !== 'Keine Kaution'
          ? `Der Mieter leistet eine Sicherheit von ${geld(kaution)}${m.kautionArt ? ` (${m.kautionArt})` : ''}. Bei einer Geldsumme ist er berechtigt, sie in drei gleichen monatlichen Teilzahlungen zu leisten; die erste ist zu Beginn des Mietverhältnisses fällig, die weiteren mit den unmittelbar folgenden Mietzahlungen (§ 551 Abs. 2 BGB). Der Vermieter legt die Kaution getrennt von seinem Vermögen bei einem Kreditinstitut zu dem für Spareinlagen mit dreimonatiger Kündigungsfrist üblichen Zinssatz an; die Zinsen erhöhen die Sicherheit (§ 551 Abs. 3 BGB).${konto ? ` Kautionskonto: ${konto.bezeichnung}, IBAN ${konto.iban}.` : ''}`
          : 'Eine Mietsicherheit wird nicht vereinbart.'),
      ...absatz('§ 6 Nutzung, Untervermietung, Tierhaltung',
        'Die Wohnung wird zu Wohnzwecken vermietet. Eine Untervermietung oder sonstige Gebrauchsüberlassung an Dritte bedarf der Erlaubnis des Vermieters (§§ 540, 553 BGB).',
        'Kleintiere (z. B. Ziervögel, Zierfische, Hamster) dürfen ohne Erlaubnis gehalten werden. Für andere Tiere, insbesondere Hunde und Katzen, holt der Mieter vorher die Zustimmung ein; sie wird nach Abwägung im Einzelfall erteilt.'),
      ...absatz('§ 7 Instandhaltung, Mängel, Sorgfalt',
        'Der Vermieter erhält die Wohnung in vertragsgemäßem Zustand (§ 535 BGB). Mängel zeigt der Mieter unverzüglich an (§ 536c BGB) – am einfachsten über die Hausverwaltung. Der Mieter behandelt die Mietsache pfleglich, lüftet und heizt ausreichend und beachtet die beigefügte Hausordnung, die Bestandteil dieses Vertrags ist.',
        'Bauliche Veränderungen durch den Mieter bedürfen der vorherigen Zustimmung des Vermieters.'),
      ...absatz('§ 8 Übergabe und Rückgabe',
        `Die Wohnung wird mit einem gemeinsamen Protokoll übergeben (Zustand, Zählerstände, Schlüssel).${m.schluessel ? ` Übergeben werden: ${m.schluessel}.` : ''} Bei Ende des Mietverhältnisses gibt der Mieter die Wohnung geräumt mit allen Schlüsseln zurück.`),
      ...absatz('§ 9 Energieausweis und Datenschutz',
        'Der Mieter hat bei Vertragsschluss den Energieausweis (Kopie) erhalten (§ 80 Abs. 4 GEG).',
        'Vermieter und Hausverwaltung verarbeiten die Daten des Mieters zur Durchführung dieses Vertrags (Art. 6 Abs. 1 lit. b DSGVO). Näheres steht in der beigefügten Datenschutzinformation.'),
      ...absatz('§ 10 Besondere Vereinbarungen', m.vereinbarungen ? h('p', { class: 'din__vereinbart' }, m.vereinbarungen) : 'Keine.'),
      ...absatz('§ 11 Schlussbestimmungen',
        'Mündliche Nebenabreden bestehen nicht. Ist eine Bestimmung unwirksam, bleibt der Vertrag im Übrigen wirksam; es gilt dann die gesetzliche Regelung.',
        `Anlagen: Hausordnung, Datenschutzinformation, Einzugsformular, Übergabeprotokoll, Energieausweis (Kopie)${m.einzug?.zahlweise === 'SEPA-Lastschrift' ? ', SEPA-Lastschriftmandat' : ''}${m.kautionArt === 'Bürgschaft' ? ', Bürgschaftserklärung' : ''}.`),
      unterschriften));
};

/* ---------- Wohnungsgeberbestätigung (§ 19 BMG) ---------- */
routen.wohnungsgeber = (id, artText) => {
  const k = kontext(id);
  if (!k) return fehlt();
  const { m, einheit, objekt, kunde } = k;
  const a = absender();
  const auszug = artText === 'auszug';
  const tag = auszug ? m.ende : m.beginn;
  const leer = h('tr', {}, h('td', { class: 'vw-linie' }), h('td', { class: 'vw-linie' }));
  return h('div', { class: 'vw-stapel' },
    werkzeug(`#/mietverhaeltnis/${m.id}`,
      h('a', { class: 'vw-knopf', href: `#/wohnungsgeber/${m.id}/${auszug ? 'einzug' : 'auszug'}` }, auszug ? 'Für Einzug' : 'Für Auszug'),
      h('button', { class: 'vw-knopf', onclick: () => { speichere('mieter', { id: m.id, schritte: { ...(m.schritte ?? {}), wgb: heute() } }); hinweis('In der Checkliste als erledigt vermerkt'); } }, 'Als ausgestellt vermerken')),
    !kunde && h('p', { class: 'vw-warnung vw-nichtdrucken' }, 'Dem Objekt ist kein Eigentümer (Kunde) zugeordnet. Name und Anschrift des Eigentümers sind Pflichtangaben.'),
    auszug && !m.ende && h('p', { class: 'vw-warnung vw-nichtdrucken' }, 'Für dieses Mietverhältnis ist noch kein Mietende eingetragen.'),
    bogen(anschriftMieter(k), 'Wohnungsgeberbestätigung nach § 19 Bundesmeldegesetz',
      briefInfo(['Objekt', objekt.bezeichnung], ['Einheit', einheit.bezeichnung]),
      h('p', {}, `Hiermit wird bestätigt, dass die unten genannten Personen in die folgende Wohnung ${auszug ? 'ausgezogen' : 'eingezogen'} sind.`),
      h('table', { class: 'vw-brief__tabelle din__formular' }, h('tbody', {},
        h('tr', {}, h('th', {}, 'Art des Vorgangs'), h('td', {}, auszug ? `Auszug am ${datum(tag)}` : `Einzug am ${datum(tag)}`)),
        h('tr', {}, h('th', {}, 'Anschrift der Wohnung'), h('td', {}, [objekt.strasse, objekt.ort].filter(Boolean).join(', ') || objekt.bezeichnung, einheit.lage ? ` – ${einheit.lage}` : '', ` (${einheit.bezeichnung})`)),
        h('tr', {}, h('th', {}, 'Wohnungsgeber (Eigentümer)'), h('td', {}, kunde ? [kunde.name, kunde.strasse, kunde.ort].filter(Boolean).join(', ') : '')),
        h('tr', {}, h('th', {}, 'Beauftragt vom Wohnungsgeber'), h('td', {}, [a.name, a.strasse, a.ort].filter(Boolean).join(', '))))),
      h('h3', { class: 'din__para' }, 'Meldepflichtige Personen'),
      h('table', { class: 'vw-brief__tabelle din__formular' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Name, Vorname'), h('th', {}, 'Bemerkung'))),
        h('tbody', {}, personen(m).map((p) => h('tr', {}, h('td', {}, p), h('td', {}))), leer, leer)),
      h('p', {}, 'Weitere eingezogene Personen (z. B. Kinder) bitte oben ergänzen.'),
      h('p', { class: 'vw-fein' }, 'Hinweis: Die Bestätigung legt die meldepflichtige Person bei der Meldebehörde vor. Die Anmeldung muss innerhalb von zwei Wochen nach dem Einzug erfolgen (§ 17 BMG).'),
      h('div', { class: 'vw-brief__sign din__sign' }, h('span', {}, 'Ort, Datum'), h('span', {}, `Unterschrift Wohnungsgeber bzw. beauftragte Person (${a.name ?? 'Verwaltung'})`))));
};

/* ---------- Kautionsbriefe ---------- */
routen.kautionsbrief = (id, artText) => {
  const k = kontext(id);
  if (!k) return fehlt();
  const { m, einheit, objekt } = k;
  const b = kautionsbuchungen(m);
  const konto = kautionskonto(m);
  const summe = (art: string) => b.filter((x) => x.art === art).reduce((s, x) => s + zahl(x.betrag), 0);
  const zeile = (text: string, betrag: string, fett = false) => h('tr', { class: fett ? 'vw-summe' : '' }, h('td', {}, fett ? h('strong', {}, text) : text), h('td', { class: 'vw-zahlspalte' }, fett ? h('strong', {}, betrag) : betrag));
  const bezug = `Mietverhältnis ${objekt.bezeichnung}, ${einheit.bezeichnung}`;
  if (artText === 'abrechnung') {
    const eingezahlt = kautionErhalten(m);
    const zinsen = summe('Zinsen');
    const einbehalte = b.filter((x) => x.art === 'Einbehalt');
    const bestand = eingezahlt + zinsen - einbehalte.reduce((s, x) => s + zahl(x.betrag), 0);
    const vorbehalt = Math.min(Math.max(0, zahl(m.kautionVorbehalt)), Math.max(0, bestand));
    const auszahlung = bestand - vorbehalt;
    const gezahltAm = b.filter((x) => x.art === 'Auszahlung an Mieter').pop();
    const nkJahr = (m.ende || heute()).slice(0, 4);
    const vorschlag = Math.round(3 * zahl(m.nebenkosten) * 100) / 100;
    const vorbehaltFeld = h('input', { type: 'number', step: '0.01', min: '0', value: m.kautionVorbehalt ?? '', id: 'kv-betrag', inputmode: 'decimal' }) as HTMLInputElement;
    return h('div', { class: 'vw-stapel' }, werkzeug(`#/mietverhaeltnis/${m.id}`),
      !m.ende && h('p', { class: 'vw-warnung vw-nichtdrucken' }, 'Für dieses Mietverhältnis ist noch kein Mietende eingetragen.'),
      !m.anschriftNeu && h('p', { class: 'vw-warnung vw-nichtdrucken' }, 'Die neue Anschrift des Mieters fehlt – das Schreiben geht sonst an die alte Wohnung. ', h('button', { class: 'vw-knopf vw-knopf--klein', onclick: () => formular('mieter', m) }, 'Eintragen')),
      h('section', { class: 'vw-karte vw-nichtdrucken' }, h('div', { class: 'vw-innen' },
        h('h2', {}, 'Einbehalt für die Nebenkosten'),
        h('p', { class: 'vw-fein' }, `Steht die Betriebskostenabrechnung ${nkJahr} noch aus, dürfen Sie einen angemessenen Teil der Kaution bis dahin zurückbehalten. Üblich sind etwa drei bis vier Monatsvorauszahlungen (Vorschlag: ${geld(vorschlag)}). Der Rest wird jetzt ausgezahlt.`),
        h('div', { class: 'vw-reihe' }, h('label', { for: 'kv-betrag' }, 'Vorläufig einbehalten (€)'), vorbehaltFeld,
          h('button', { class: 'vw-knopf vw-knopf--klein', onclick: () => { vorbehaltFeld.value = String(vorschlag); } }, 'Vorschlag übernehmen'),
          h('button', { class: 'vw-knopf vw-knopf--voll vw-knopf--klein', onclick: () => { speichere('mieter', { id: m.id, kautionVorbehalt: vorbehaltFeld.value === '' ? '' : Number(vorbehaltFeld.value) }); zeichne(); } }, 'Übernehmen')))),
      bogen(anschriftMieter(k), 'Abrechnung Ihrer Mietkaution',
        briefInfo(['Objekt', objekt.bezeichnung], ['Einheit', einheit.bezeichnung], ['Mietende', m.ende ? datum(m.ende) : undefined]),
        h('p', {}, anredeZeile(m)),
        h('p', {}, `nach Beendigung Ihres Mietverhältnisses (${objekt.bezeichnung}, ${einheit.bezeichnung}) rechnen wir Ihre Mietkaution wie folgt ab:`),
        h('table', { class: 'vw-brief__tabelle' }, h('tbody', {},
          zeile('Eingezahlte Kaution', geld(eingezahlt)),
          zeile('Zinsen', geld(zinsen)),
          ...einbehalte.map((x) => zeile(`abzüglich ${x.notiz || 'Einbehalt'}`, `− ${geld(x.betrag)}`)),
          vorbehalt > 0 && zeile(`vorläufig einbehalten bis zur Betriebskostenabrechnung ${nkJahr}`, `− ${geld(vorbehalt)}`),
          zeile(auszahlung >= 0 ? (vorbehalt > 0 ? 'Auszahlung jetzt' : 'Auszahlung an Sie') : 'Restforderung', geld(Math.abs(auszahlung)), true))),
        vorbehalt > 0 && h('p', {}, `Den einbehaltenen Betrag von ${geld(vorbehalt)} rechnen wir ab, sobald die Betriebskostenabrechnung ${nkJahr} vorliegt. Ein Guthaben zahlen wir Ihnen dann zusammen mit dem Rest aus.`),
        auszahlung > 0 && h('p', {}, gezahltAm ? `Den Betrag haben wir am ${datum(gezahltAm.datum)} an Sie überwiesen.` : 'Den Betrag überweisen wir auf das Konto, das Sie uns genannt haben. Bitte teilen Sie uns Ihre Bankverbindung mit, falls noch nicht geschehen.'),
        auszahlung < 0 && h('p', {}, `Bitte überweisen Sie den offenen Betrag von ${geld(-auszahlung)} innerhalb von 14 Tagen.`),
        h('p', {}, 'Bei Fragen zur Abrechnung sprechen Sie uns gern an.'),
        ...gruss()));
  }
  const eingaenge = b.filter((x) => x.art === 'Eingang');
  return h('div', { class: 'vw-stapel' }, werkzeug(`#/mietverhaeltnis/${m.id}`),
    !konto && h('p', { class: 'vw-warnung vw-nichtdrucken' }, 'Kein Kautionskonto gewählt – der Satz zur getrennten Anlage entfällt im Schreiben.'),
    bogen(anschriftMieter(k), 'Bestätigung über den Erhalt der Mietkaution',
      briefInfo(['Objekt', objekt.bezeichnung], ['Einheit', einheit.bezeichnung]),
      h('p', {}, anredeZeile(m)),
      h('p', {}, `für das ${bezug} bestätigen wir den Eingang folgender Kautionszahlungen:`),
      h('table', { class: 'vw-brief__tabelle' }, h('tbody', {},
        ...(eingaenge.length ? eingaenge.map((x) => zeile(`${datum(x.datum)}${x.notiz ? ` – ${x.notiz}` : ''}`, geld(x.betrag))) : [zeile('Kaution (Summe)', geld(kautionErhalten(m)))]),
        zeile('Eingezahlt insgesamt', geld(kautionErhalten(m)), true),
        zahl(m.kautionSoll) > kautionErhalten(m) && zeile('Noch offen', geld(zahl(m.kautionSoll) - kautionErhalten(m))))),
      konto && h('p', {}, `Die Kaution wird getrennt von unserem Vermögen auf dem Kautionskonto ${konto.bezeichnung}${konto.bank ? ` bei der ${konto.bank}` : ''} (IBAN ${konto.iban}) verwahrt. Zinsen stehen Ihnen zu und erhöhen die Sicherheit (§ 551 Abs. 3 BGB).`),
      h('p', {}, 'Bitte bewahren Sie diese Bestätigung bis zur Rückzahlung der Kaution auf.'),
      ...gruss()));
};

/* ---------- Kündigungsbestätigung ---------- */
routen.kuendigung = (id) => {
  const k = kontext(id);
  if (!k) return fehlt();
  const { m, einheit, objekt } = k;
  const rechnung = kuendigungsEnde(m.kuendigungEingang, m.kuendigungDurch || 'Mieter', m.beginn);
  const abweichend = rechnung && m.ende && rechnung.ende !== m.ende;
  return h('div', { class: 'vw-stapel' },
    werkzeug(`#/mietverhaeltnis/${m.id}`, h('button', { class: 'vw-knopf', onclick: () => { speichere('mieter', { id: m.id, schritte: { ...(m.schritte ?? {}), kuendigungBestaetigt: heute() } }); hinweis('In der Checkliste vermerkt'); } }, 'Als versandt vermerken')),
    !m.kuendigungEingang && h('p', { class: 'vw-warnung vw-nichtdrucken' }, 'Bitte tragen Sie ein, wann die Kündigung eingegangen ist (Mietverhältnis bearbeiten).'),
    rechnung && h('p', { class: 'vw-fein vw-nichtdrucken' }, `Fristberechnung: ${rechnung.text} Frühestes Mietende: ${datum(rechnung.ende)}.`),
    abweichend && h('p', { class: 'vw-warnung vw-nichtdrucken' }, `Eingetragenes Mietende (${datum(m.ende)}) weicht von der gesetzlichen Frist ab (${datum(rechnung!.ende)}). Ist ein anderer Termin vereinbart, passt das so.`),
    bogen(anschriftMieter(k), 'Bestätigung Ihrer Kündigung',
      briefInfo(['Objekt', objekt.bezeichnung], ['Einheit', einheit.bezeichnung]),
      h('p', {}, anredeZeile(m)),
      h('p', {}, `wir bestätigen den Eingang Ihrer Kündigung${m.kuendigungEingang ? ` am ${datum(m.kuendigungEingang)}` : ''} für ${wohnungText(einheit)}, ${[objekt.strasse, objekt.ort].filter(Boolean).join(', ')}. Das Mietverhältnis endet am `, h('strong', {}, datum(m.ende)), '.'),
      h('p', {}, 'Für die Rückgabe der Wohnung schlagen wir einen gemeinsamen Termin am letzten Tag des Mietverhältnisses vor. Bitte melden Sie sich bei uns, damit wir ihn abstimmen können. Bei der Abnahme erstellen wir ein Protokoll, lesen die Zähler ab und nehmen alle Schlüssel zurück.'),
      h('p', {}, 'Bitte denken Sie an:'),
      h('ul', {},
        h('li', {}, 'die Wohnung vollständig geräumt und besenrein zurückzugeben,'),
        h('li', {}, `alle Schlüssel mitzubringen${m.schluessel ? ` (übergeben wurden: ${m.schluessel})` : ''},`),
        h('li', {}, 'Ihre Verträge mit dem Strom- und gegebenenfalls Gasversorger zu kündigen oder umzumelden,'),
        h('li', {}, 'uns Ihre neue Anschrift und Bankverbindung mitzuteilen – für die Abrechnung von Nebenkosten und Kaution.')),
      zahl(m.kautionSoll) > 0 && h('p', {}, 'Ihre Kaution rechnen wir nach der Rückgabe ab. Steht noch eine Betriebskostenabrechnung aus, kann ein angemessener Teil bis zu deren Vorliegen einbehalten werden.'),
      h('p', {}, 'Wir bedanken uns für das Mietverhältnis und wünschen Ihnen für die Zukunft alles Gute.'),
      ...gruss()));
};

/* ---------- Kautionen des Objekts (Reiter Finanzen) ---------- */
export function objektKautionen(objektId: string): HTMLElement {
  const mv = alle('mieter').filter((m) => finde('einheiten', m.einheitId)?.objektId === objektId
    && (mietStand(m) === 'Beendet' ? kautionBestand(m) > 0.005 : zahl(m.kautionSoll) > 0 || kautionBestand(m) > 0));
  return h('section', { class: 'vw-karte' },
    h('header', { class: 'vw-karte__kopf' }, h('h2', {}, 'Kautionen ', h('span', { class: 'vw-zahl' }, String(mv.length))), h('span', {}, `verwahrt: ${geld(mv.reduce((s, m) => s + kautionBestand(m), 0))}`)),
    h('div', { class: 'vw-tabelle' }, h('table', {},
      h('thead', {}, h('tr', {}, ['Mieter', 'Einheit', 'Vereinbart', 'Verwahrt', 'Konto', 'Stand'].map((t) => h('th', { scope: 'col' }, t)))),
      h('tbody', {}, mv.length ? mv.map((m) => {
        const offen = zahl(m.kautionSoll) - kautionErhalten(m);
        return h('tr', { tabindex: 0, onclick: () => (location.hash = `#/mietverhaeltnis/${m.id}`) },
          h('td', { 'data-spalte': 'Mieter' }, m.name), h('td', { 'data-spalte': 'Einheit' }, finde('einheiten', m.einheitId)?.bezeichnung ?? ''),
          h('td', { 'data-spalte': 'Vereinbart', class: 'vw-zahlspalte' }, geld(m.kautionSoll)), h('td', { 'data-spalte': 'Verwahrt', class: 'vw-zahlspalte' }, geld(kautionBestand(m))),
          h('td', { 'data-spalte': 'Konto' }, kautionskonto(m)?.bezeichnung ?? '–'),
          h('td', { 'data-spalte': 'Stand' }, mietStand(m) === 'Beendet' ? marke('Abrechnen', 'blau') : offen > 0.005 ? marke(`${geld(offen)} offen`, 'gelb') : marke('Vollständig', 'gruen')));
      }) : [h('tr', {}, h('td', { colspan: 6, class: 'vw-leer' }, 'Keine Kautionen in diesem Objekt.'))]))));
}

export { kautionskonto, personen };
/** Offene Schritte der Einzugs- oder Auszugs-Checkliste (für „Heute“) */
export function offeneSchritte(m: Satz, auszug: boolean): string[] {
  const k = kontext(m.id);
  if (!k) return [];
  return (auszug ? auszugSchritte(k) : schritte(k)).filter((x) => !x.fertig).map((x) => x.text);
}
// Für das Objektmodul (app.ts lädt dieses Modul nicht direkt)
routes_registrieren();
function routes_registrieren() { routen.objektkautionen = (id) => objektKautionen(id ?? ''); }
