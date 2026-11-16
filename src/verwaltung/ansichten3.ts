/**
 * BANKABGLEICH und EIGENTÜMERABRECHNUNG
 * ---------------------------------------------------------------
 * Bankabgleich: Der Kontoauszug (CSV-Datei aus dem Online-Banking)
 * wird im Browser gelesen – die Datei verlässt das Gerät nicht.
 * Zahlungseingänge werden nach Name, Verwendungszweck und Betrag
 * den Mietverhältnissen zugeordnet und nach Bestätigung gebucht.
 *
 * Eigentümerabrechnung: Einnahmen minus Kosten minus Vergütung =
 * Auszahlungsbetrag; im Jahr zusätzlich eine Aufstellung als
 * Zuarbeit für den Steuerberater (keine Steuerberatung).
 */
import { alle, finde, heute, speichere, type Satz } from './speicher';
import { ARTEN } from './schema';
import { aktivIm, mieterVon, monatHeute, monatPlus, monatVon, objektVonMieter, rechnungSumme, rueckstand, soll, zahl } from './rechnen';
import { datum, geld, h, hinweis, kennzahl, marke, monatText, routen, zeichne } from './app';
import { bogen, gruss, werkzeug } from './ansichten2';

/* ================= CSV lesen ================= */
function csv(text: string, trenner: string): string[][] {
  const zeilen: string[][] = [];
  let feld = '', zeile: string[] = [], inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"' && text[i + 1] === '"') { feld += '"'; i++; }
      else if (c === '"') inQuote = false;
      else feld += c;
    } else if (c === '"') inQuote = true;
    else if (c === trenner) { zeile.push(feld); feld = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      zeile.push(feld); feld = '';
      if (zeile.some((x) => x.trim())) zeilen.push(zeile);
      zeile = [];
    } else feld += c;
  }
  zeile.push(feld);
  if (zeile.some((x) => x.trim())) zeilen.push(zeile);
  return zeilen;
}
function betragVon(roh: string): number {
  let t = (roh ?? '').replace(/[\s€]|EUR/gi, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  return Number(t);
}
function datumVon(roh: string): string {
  const t = (roh ?? '').trim();
  let m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

type Umsatz = { datum: string; name: string; zweck: string; betrag: number; mieterId: string; monat: string; sicher: boolean; doppelt: boolean; buchen: boolean };
let umsaetze: Umsatz[] = [];
let uebersprungen = 0;
let leseFehler = '';

const SPALTEN = {
  datum: ['buchungstag', 'buchungsdatum', 'buchung', 'datum', 'valuta', 'wertstellung'],
  betrag: ['betrag', 'umsatz'],
  name: ['beguenstigter', 'begünstigter', 'zahlungspflichtiger', 'auftraggeber', 'name', 'empfänger', 'empfaenger', 'gegenkonto'],
  zweck: ['verwendungszweck', 'zweck', 'buchungstext', 'vorgang'],
  sh: ['soll/haben', 's/h', 'soll-haben'],
};

/** Ordnet einen Zahlungseingang einem Mietverhältnis zu. */
function zuordnen(u: { name: string; zweck: string; betrag: number }): { mieterId: string; sicher: boolean } {
  const heu = `${u.name} ${u.zweck}`.toLowerCase();
  const kandidaten = alle('mieter').map((m) => {
    const worte = String(m.name).toLowerCase().split(/[^a-zäöüß]+/).filter((w) => w.length >= 3 && !['beispiel', 'und', 'gmbh', 'frau', 'herr', 'mieter'].includes(w));
    const treffer = worte.filter((w) => heu.includes(w)).length;
    const betragPasst = Math.abs(u.betrag - soll(m)) < 0.01;
    return { m, punkte: treffer * 2 + (betragPasst ? 1 : 0), treffer, betragPasst };
  }).filter((k) => k.punkte > 0).sort((a, b) => b.punkte - a.punkte);
  if (!kandidaten.length) return { mieterId: '', sicher: false };
  const [erster, zweiter] = kandidaten;
  const eindeutig = !zweiter || erster.punkte > zweiter.punkte;
  if (!eindeutig) return { mieterId: '', sicher: false };
  return { mieterId: erster.m.id, sicher: erster.treffer > 0 && erster.betragPasst };
}

async function lies(datei: File) {
  leseFehler = '';
  umsaetze = [];
  uebersprungen = 0;
  const puffer = await datei.arrayBuffer();
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(puffer); } catch { text = new TextDecoder('windows-1252').decode(puffer); }
  text = text.replace(/^﻿/, '');
  const trenner = (text.match(/;/g)?.length ?? 0) >= (text.match(/,/g)?.length ?? 0) ? ';' : ',';
  const zeilen = csv(text, trenner);
  // Die Reihenfolge der Namen zählt: «verwendungszweck» wird vor «buchungstext» gesucht.
  const finde2 = (kopf: string[], namen: string[]) => {
    for (const n of namen) { const i = kopf.findIndex((k) => k.includes(n)); if (i >= 0) return i; }
    return -1;
  };
  const kopfIndex = zeilen.findIndex((z) => { const k = z.map((x) => x.toLowerCase()); return finde2(k, SPALTEN.datum) >= 0 && finde2(k, SPALTEN.betrag) >= 0; });
  if (kopfIndex < 0) { leseFehler = 'In der Datei wurden keine Spalten für Datum und Betrag gefunden. Bitte exportieren Sie die Umsätze als CSV-Datei.'; return; }
  const kopf = zeilen[kopfIndex].map((x) => x.toLowerCase().trim());
  const sp = { datum: finde2(kopf, SPALTEN.datum), betrag: finde2(kopf, SPALTEN.betrag), name: finde2(kopf, SPALTEN.name), zweck: finde2(kopf, SPALTEN.zweck), sh: finde2(kopf, SPALTEN.sh) };
  for (const z of zeilen.slice(kopfIndex + 1)) {
    let betrag = betragVon(z[sp.betrag]);
    const tag = datumVon(z[sp.datum]);
    if (!tag || !Number.isFinite(betrag)) continue;
    if (sp.sh >= 0 && /^s/i.test((z[sp.sh] ?? '').trim())) betrag = -Math.abs(betrag);
    if (betrag <= 0) { uebersprungen++; continue; }
    const u = { datum: tag, name: (z[sp.name] ?? '').trim(), zweck: sp.zweck >= 0 ? (z[sp.zweck] ?? '').trim() : '', betrag };
    const { mieterId, sicher } = zuordnen(u);
    const doppelt = !!mieterId && alle('zahlungen').some((x) => x.mieterId === mieterId && x.datum === tag && Math.abs(zahl(x.betrag) - betrag) < 0.01);
    umsaetze.push({ ...u, mieterId, monat: monatVon(tag), sicher, doppelt, buchen: !!mieterId && !doppelt });
  }
  if (!umsaetze.length && !uebersprungen) leseFehler = 'Die Datei enthält keine lesbaren Umsätze.';
}

routen.bank = () => {
  const eingabe = h('input', { type: 'file', accept: '.csv,text/csv,text/plain', class: 'sr-only', id: 'vw-bank', onchange: async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) { try { await lies(f); } catch { leseFehler = 'Die Datei konnte nicht gelesen werden.'; } zeichne(); }
  } });
  const zuBuchen = umsaetze.filter((u) => u.buchen && u.mieterId);
  const mieterWahl = (u: Umsatz) => h('select', { 'aria-label': 'Mietverhältnis', onchange: (e: Event) => { u.mieterId = (e.target as HTMLSelectElement).value; u.buchen = !!u.mieterId; u.sicher = false; zeichne(); } },
    h('option', { value: '' }, '– nicht zuordnen –'), alle('mieter').map((m) => h('option', { value: m.id, selected: m.id === u.mieterId }, ARTEN.mieter.anzeige(m))));
  return h('div', { class: 'vw-stapel' },
    h('header', { class: 'vw-seitenkopf' }, h('h1', {}, 'Bankabgleich'),
      h('p', {}, 'Laden Sie die Umsätze aus Ihrem Online-Banking als CSV-Datei. Das Tool ordnet Zahlungseingänge den Mietverhältnissen zu; gebucht wird erst nach Ihrer Bestätigung. Die Datei wird nur in diesem Browser gelesen und nirgendwohin übertragen.')),
    h('div', { class: 'vw-reihe' },
      h('label', { class: 'vw-knopf vw-knopf--voll', for: 'vw-bank' }, umsaetze.length ? 'Andere Datei wählen' : 'Kontoauszug (CSV) wählen'), eingabe,
      umsaetze.length > 0 && h('button', { class: 'vw-knopf', onclick: () => { umsaetze = []; uebersprungen = 0; zeichne(); } }, 'Verwerfen'),
      h('span', { class: 'vw-platz' }),
      zuBuchen.length > 0 && h('button', { class: 'vw-knopf vw-knopf--voll', onclick: () => {
        zuBuchen.forEach((u) => speichere('zahlungen', { mieterId: u.mieterId, monat: u.monat, betrag: u.betrag, datum: u.datum, notiz: `Bank: ${[u.name, u.zweck].filter(Boolean).join(' · ')}`.slice(0, 140) }));
        hinweis(`${zuBuchen.length} Zahlung(en) gebucht`);
        umsaetze = umsaetze.filter((u) => !zuBuchen.includes(u));
        zeichne();
      } }, `${zuBuchen.length} Zahlung(en) buchen`)),
    leseFehler && h('p', { class: 'vw-warnung' }, leseFehler),
    umsaetze.length > 0 && h('div', { class: 'vw-kennzahlen' },
      kennzahl(String(umsaetze.length), 'Zahlungseingänge'),
      kennzahl(String(umsaetze.filter((u) => u.sicher && !u.doppelt).length), 'sicher zugeordnet', undefined, 'vw-kennzahl--blau'),
      kennzahl(String(umsaetze.filter((u) => !u.mieterId).length), 'nicht zugeordnet', undefined, umsaetze.some((u) => !u.mieterId) ? 'vw-kennzahl--gelb' : ''),
      kennzahl(String(umsaetze.filter((u) => u.doppelt).length), 'bereits gebucht'),
      kennzahl(String(uebersprungen), 'Ausgänge übersprungen')),
    umsaetze.length > 0 && h('section', { class: 'vw-karte' }, h('div', { class: 'vw-tabelle' }, h('table', {},
      h('thead', {}, h('tr', {}, ['Buchen', 'Datum', 'Auftraggeber / Zweck', 'Betrag', 'Mietverhältnis', 'Für Monat', 'Prüfung'].map((t) => h('th', { scope: 'col' }, t)))),
      h('tbody', {}, umsaetze.map((u) => h('tr', {},
        h('td', { 'data-spalte': 'Buchen' }, h('input', { type: 'checkbox', 'aria-label': 'Buchen', checked: u.buchen && !!u.mieterId, disabled: !u.mieterId, onchange: (e: Event) => { u.buchen = (e.target as HTMLInputElement).checked; zeichne(); } })),
        h('td', { 'data-spalte': 'Datum' }, datum(u.datum)),
        h('td', { 'data-spalte': 'Auftraggeber / Zweck' }, h('strong', {}, u.name || '–'), u.zweck && h('small', { class: 'vw-block' }, u.zweck)),
        h('td', { 'data-spalte': 'Betrag', class: 'vw-zahlspalte' }, geld(u.betrag)),
        h('td', { 'data-spalte': 'Mietverhältnis' }, mieterWahl(u)),
        h('td', { 'data-spalte': 'Für Monat' }, h('input', { type: 'month', 'aria-label': 'Für Monat', value: u.monat, onchange: (e: Event) => { u.monat = (e.target as HTMLInputElement).value || u.monat; } })),
        h('td', { 'data-spalte': 'Prüfung' }, u.doppelt ? marke('Bereits gebucht', 'grau') : !u.mieterId ? marke('Bitte zuordnen', 'gelb') : u.sicher ? marke('Name und Betrag passen', 'gruen') : marke('Bitte prüfen', 'gelb'))))))),
      h('p', { class: 'vw-fein' }, '„Name und Betrag passen“ heißt: Der Name des Mieters steht im Umsatz und der Betrag entspricht der Sollmiete. Alles andere bitte ansehen, bevor Sie buchen.')),
    !umsaetze.length && !leseFehler && h('section', { class: 'vw-karte vw-text' },
      h('h2', {}, 'So geht es'),
      h('p', {}, '1. Im Online-Banking die Umsätze des Mietkontos als CSV-Datei exportieren. 2. Datei hier auswählen. 3. Zuordnung prüfen und buchen.'),
      h('p', { class: 'vw-fein' }, 'Erkannt werden die üblichen Spalten deutscher Banken (Buchungstag, Betrag, Auftraggeber oder Begünstigter, Verwendungszweck). Ausgänge werden übersprungen.')));
};

/* ================= Eigentümerabrechnung ================= */
let abrMonat = monatPlus(monatHeute(), -1);
let abrJahr = false;
routen.abrechnung = (objektId) => {
  const objekte = alle('objekte');
  const objekt = finde('objekte', objektId) ?? objekte[0];
  if (!objekt) return h('div', { class: 'vw-stapel' }, h('header', { class: 'vw-seitenkopf' }, h('h1', {}, 'Eigentümerabrechnung')), h('p', { class: 'vw-leer' }, 'Legen Sie zuerst ein Objekt an.'));
  const kunde = finde('kunden', objekt.kundeId);
  const jahr = abrMonat.slice(0, 4);
  const imMonat = (m?: string) => !!m && (abrJahr ? m.startsWith(jahr) : m === abrMonat);
  const titel = abrJahr ? `Jahr ${jahr}` : monatText(abrMonat);
  const mieter = mieterVon(objekt.id);

  // Einnahmen, aufgeteilt in Kaltmiete und Nebenkosten-Vorauszahlung (im Verhältnis der Sollbeträge)
  let kalt = 0, nk = 0;
  for (const z of alle('zahlungen')) {
    const m = mieter.find((x) => x.id === z.mieterId);
    if (!m || !imMonat(z.monat)) continue;
    const anteil = soll(m) ? zahl(m.kaltmiete) / soll(m) : 1;
    kalt += zahl(z.betrag) * anteil;
    nk += zahl(z.betrag) * (1 - anteil);
  }
  const kosten = alle('kosten').filter((k) => k.objektId === objekt.id && imMonat(monatVon(k.datum)));
  const gruppe = (umlage: boolean) => {
    const g = new Map<string, number>();
    kosten.filter((k) => !!k.umlage === umlage).forEach((k) => g.set(k.kostenart, (g.get(k.kostenart) ?? 0) + zahl(k.betrag)));
    return [...g].sort();
  };
  const sumKosten = kosten.reduce((s, k) => s + zahl(k.betrag), 0);
  const rechnungen = alle('rechnungen').filter((r) => r.objektId === objekt.id && ['Offen', 'Bezahlt'].includes(r.status) && imMonat(monatVon(r.datum)));
  const verguetung = rechnungen.reduce((s, r) => s + rechnungSumme(r).brutto, 0);
  const einnahmen = kalt + nk;
  const auszahlung = einnahmen - sumKosten - verguetung;
  const offen = mieter.map((m) => ({ m, betrag: rueckstand(m) })).filter((x) => x.betrag > 0);
  const zeile = (text: string | Node, betrag: number, stark = false) => h('tr', {}, h(stark ? 'th' : 'td', {}, text), h(stark ? 'th' : 'td', { class: 'vw-zahlspalte' }, geld(betrag)));
  const block = (titel2: string) => h('tr', {}, h('th', { colspan: 2, class: 'vw-zwischen' }, titel2));

  return h('div', { class: 'vw-stapel' },
    werkzeug(`#/objekt/${objekt.id}`,
      h('select', { 'aria-label': 'Objekt', onchange: (e: Event) => (location.hash = `#/abrechnung/${(e.target as HTMLSelectElement).value}`) }, objekte.map((o) => h('option', { value: o.id, selected: o.id === objekt.id }, o.bezeichnung))),
      h('button', { class: 'vw-knopf', 'aria-label': 'Zurück', onclick: () => { abrMonat = monatPlus(abrMonat, abrJahr ? -12 : -1); zeichne(); } }, '←'),
      h('strong', {}, titel),
      h('button', { class: 'vw-knopf', 'aria-label': 'Vor', onclick: () => { abrMonat = monatPlus(abrMonat, abrJahr ? 12 : 1); zeichne(); } }, '→'),
      h('button', { class: 'vw-knopf', onclick: () => { abrJahr = !abrJahr; zeichne(); } }, abrJahr ? 'Monatsabrechnung' : 'Jahresabrechnung')),
    h('div', { class: 'vw-kennzahlen vw-nichtdrucken' },
      kennzahl(geld(einnahmen), 'Mieteingänge'), kennzahl(geld(sumKosten), 'Kosten'), kennzahl(geld(verguetung), 'Vergütung HaDie'),
      kennzahl(geld(auszahlung), auszahlung >= 0 ? 'Auszahlung an Eigentümer' : 'Nachschuss des Eigentümers', undefined, auszahlung >= 0 ? 'vw-kennzahl--blau' : 'vw-kennzahl--rot')),
    h('p', { class: 'vw-fein vw-nichtdrucken' }, 'Als Vergütung zählen gestellte Rechnungen an den Kunden für dieses Objekt. Erfassen Sie diese Rechnungen nicht zusätzlich als Beleg, sonst werden sie doppelt abgezogen.'),
    bogen([kunde?.name ?? 'Kunde nicht hinterlegt', kunde?.strasse, kunde?.ort], `Eigentümerabrechnung ${titel} – ${objekt.bezeichnung}`,
      h('table', { class: 'vw-brief__tabelle' }, h('tbody', {},
        block('Einnahmen'),
        zeile('Kaltmieten', kalt), zeile('Nebenkosten-Vorauszahlungen der Mieter', nk), zeile('Summe Einnahmen', einnahmen, true),
        block('Umlagefähige Kosten'),
        ...(gruppe(true).length ? gruppe(true).map(([art, b]) => zeile(art, -b)) : [h('tr', {}, h('td', { colspan: 2 }, 'keine'))]),
        block('Nicht umlagefähige Kosten'),
        ...(gruppe(false).length ? gruppe(false).map(([art, b]) => zeile(art, -b)) : [h('tr', {}, h('td', { colspan: 2 }, 'keine'))]),
        block('Vergütung der Verwaltung'),
        ...(rechnungen.length ? rechnungen.map((r) => zeile(`Rechnung ${r.nummer ?? ''} vom ${datum(r.datum)}`, -rechnungSumme(r).brutto)) : [h('tr', {}, h('td', { colspan: 2 }, 'keine gestellte Rechnung im Zeitraum'))])),
        h('tfoot', {}, zeile(auszahlung >= 0 ? 'Auszahlungsbetrag' : 'Nachschuss des Eigentümers', Math.abs(auszahlung), true))),
      offen.length > 0 && h('p', {}, `Hinweis: Es bestehen Mietrückstände von insgesamt ${geld(offen.reduce((s, x) => s + x.betrag, 0))} (${offen.map((x) => x.m.name).join(', ')}).`),
      abrJahr && h('h3', {}, `Aufstellung ${jahr} für Ihren Steuerberater`),
      abrJahr && h('table', { class: 'vw-brief__tabelle' }, h('tbody', {},
        zeile('Mieteinnahmen ohne Umlagen (Kaltmieten)', kalt),
        zeile('Vereinnahmte Umlagen (Nebenkosten-Vorauszahlungen)', nk),
        zeile('Umlagefähige Betriebskosten', kosten.filter((k) => k.umlage).reduce((s, k) => s + zahl(k.betrag), 0)),
        zeile('Erhaltungsaufwand und sonstige Kosten', kosten.filter((k) => !k.umlage).reduce((s, k) => s + zahl(k.betrag), 0)),
        zeile('Verwaltungskosten (Rechnungen der Verwaltung)', verguetung))),
      abrJahr && h('p', { class: 'vw-brief__klein' }, 'Diese Aufstellung fasst die im Verwaltertool erfassten Zahlungen und Belege zusammen. Sie ist eine Zuarbeit und ersetzt keine steuerliche Beratung. Abschreibungen, Zinsen und weitere Werbungskosten sind nicht enthalten.'),
      ...gruss()));
};
