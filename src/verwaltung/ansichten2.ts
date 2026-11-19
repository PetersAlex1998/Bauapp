/**
 * WEITERE ANSICHTEN des Verwaltertools
 * ---------------------------------------------------------------
 * Kalender, Kautionen, Eigentümerbericht, Schreiben (Zahlungserinnerung,
 * Mahnung, Übergabeprotokoll), Angebot und der Mieterwechsel-Assistent.
 * Die Seiten hängen sich über `routen` und `aktionen` in die App ein.
 *
 * Alle Schreiben sind VORLAGEN. Vor dem Versand bitte inhaltlich und
 * rechtlich prüfen.
 */
import { dokument } from './dokument';
import { alle, finde, heute, speichere, type Satz } from './speicher';
import { ARTEN } from './schema';
import { kautionBestand, kautionErhalten, kuendigungsEnde, positionen, rechnungSumme, rechnungUeberfaellig, aktivIm, datumPlus, einheitenVon, mahnstufe, mieterVon, monatHeute, monatPlus, monatVon, objektVonMieter, rueckstand, soll, tageBis, zahl } from './rechnen';
import { ds, standardZustaendig } from './ansicht';
import { ich } from './ansicht';
import { aktionen, datum, formular, geld, h, hinweis, kennzahl, liste, marke, monatText, routen, zeichne } from './app';

export const absender = (): Satz =>
  alle('absender')[0] ?? ({ id: '', name: 'HaDie-Immobilien', strasse: 'Kirsperbaumweg 23', ort: '33175 Bad Lippspringe', telefon: '0160 9500 6184' } as Satz);

/** Konten für Rechnungen und Schreiben (Administration → Unternehmen). Ältere Einträge mit IBAN direkt im Absender gelten weiter. */
export function rechnungskonten(): Satz[] {
  const k = alle('bankkonten').filter((x) => x.aufRechnungen && x.iban);
  if (k.length) return k;
  const a = absender();
  return a.iban ? [{ id: 'alt', bezeichnung: 'Bankverbindung', inhaber: a.inhaber, iban: a.iban, bank: a.bank } as Satz] : [];
}
/** Konto, auf das Mieter zahlen: ausschließlich das im Objekt gepflegte Mietkonto (nie das Geschäftskonto). */
export function mietkonto(objektId?: string): Satz | undefined {
  return alle('mietkonten').find((k) => k.objektId === objektId && k.iban);
}
export const kontoText = (k: Satz) => [k.inhaber && `Kontoinhaber ${k.inhaber}`, `IBAN ${k.iban}`, k.bic && `BIC ${k.bic}`, k.bank].filter(Boolean).join(' · ');

export const werkzeug = (zurueck: string, ...mehr: Node[]) =>
  h('div', { class: 'vw-reihe vw-nichtdrucken' },
    h('a', { class: 'vw-knopf', href: zurueck }, '← Zurück'), ...mehr, h('span', { class: 'vw-platz' }),
    !alle('absender').length && h('a', { class: 'vw-knopf', href: '#/unternehmen' }, 'Unternehmensdaten hinterlegen'),
    h('button', { class: 'vw-knopf vw-knopf--voll', title: 'Briefbogen nach DIN 5008 (A4). Im Druckdialog: Skalierung 100 %, „Kopf- und Fußzeilen“ aus. Für E-Brief „Als PDF sichern“.', onclick: () => window.print() }, 'Drucken / PDF (DIN A4)'),
    h('p', { class: 'vw-fein', style: 'flex-basis:100%;margin:0' }, 'DIN 5008 Form B – passt in Fensterumschläge (DL, C5, C4) und für E-Brief/E-POST. Im Druckdialog: Skalierung 100 %, „Kopf- und Fußzeilen“ ausschalten, für den E-Brief „Als PDF sichern“.'));

/** Zusätzliche Zeilen für den Informationsblock (z. B. Rechnungs- oder Kundennummer) */
export class BriefInfo { constructor(public zeilen: [string, string | undefined][]) {} }
export const briefInfo = (...zeilen: [string, string | undefined][]) => new BriefInfo(zeilen);

/**
 * Briefbogen nach DIN 5008, Form B (A4, Fensterumschlag DL/C5/C4, E-Brief/E-POST):
 * Briefkopf 45 mm · Anschriftfeld 20 mm links / 45 mm oben, 85 × 45 mm (Zusatz- und Vermerkzone
 * mit Rücksendeangabe + Anschriftzone, max. 6 Zeilen) · Informationsblock ab 125 mm links / 50 mm oben ·
 * Text ab ca. 98,5 mm, Ränder links 25 mm, rechts 20 mm · Falzmarken 105 / 210 mm, Lochmarke 148,5 mm ·
 * Geschäftsangaben in der Fußzeile. Maße stehen in verwaltung.css (.din).
 */
export function bogen(empfaenger: (string | undefined)[], betreff: string, ...inhalt: (Node | string | false | null | undefined | BriefInfo)[]): HTMLElement {
  const a = absender();
  const extra = inhalt.filter((x): x is BriefInfo => x instanceof BriefInfo).flatMap((x) => x.zeilen).filter(([, w]) => w);
  const text = inhalt.filter((x) => !(x instanceof BriefInfo)) as (Node | string | false | null | undefined)[];
  const person = ich();
  const ansprech = person?.name || a.gruss || a.inhaber || a.name;
  const zeilen: [string, string | undefined][] = [
    ...extra,
    ['Ansprechpartner', ansprech],
    ['Telefon', person?.telefon || a.telefon],
    ['E-Mail', person?.email || a.email],
    ...(extra.some(([l]) => /datum/i.test(l)) ? [] : [['Datum', datum(heute())] as [string, string]]),
  ];
  const konten = rechnungskonten();
  const anschrift = empfaenger.filter(Boolean).slice(0, 6) as string[];
  return h('article', { class: 'vw-brief din' },
    h('div', { class: 'din__marke din__marke--falz1', 'aria-hidden': 'true' }),
    h('div', { class: 'din__marke din__marke--loch', 'aria-hidden': 'true' }),
    h('div', { class: 'din__marke din__marke--falz2', 'aria-hidden': 'true' }),
    // Kopfzeile ab Seite 2 (wiederholt sich beim Drucken; auf Seite 1 vom Briefkopf verdeckt)
    h('div', { class: 'din__folgekopf', 'aria-hidden': 'true' }, h('span', {}, a.name), h('span', {}, betreff)),
    h('div', { class: 'din__deckel', 'aria-hidden': 'true' }),
    h('header', { class: 'din__kopf' },
      a.logo ? h('img', { class: 'din__logo', src: a.logo, alt: a.name ?? 'Logo' }) : h('p', { class: 'din__firma' }, a.name)),
    h('div', { class: 'din__anschriftfeld' },
      h('p', { class: 'din__ruecksendung' }, [a.name, a.strasse, a.ort].filter(Boolean).join(' · ')),
      h('address', { class: 'din__anschrift' }, anschrift.map((z) => h('span', {}, z)))),
    h('dl', { class: 'din__info' }, zeilen.filter(([, w]) => w).map(([l, w]) => [h('dt', {}, l), h('dd', {}, w!)])),
    // Tabelle nur fürs Drucken: der leere Tabellenfuß reserviert auf jeder Seite Platz für die Fußzeile
    h('table', { class: 'din__seiten', role: 'presentation' },
      h('thead', {}, h('tr', {}, h('td', { class: 'din__oben' }))),
      h('tbody', {}, h('tr', {}, h('td', {}, h('div', { class: 'din__text' }, h('h2', { class: 'din__betreff' }, betreff), ...text)))),
      h('tfoot', {}, h('tr', {}, h('td', { class: 'din__platz' })))),
    h('footer', { class: 'din__fuss' },
      h('div', {}, h('strong', {}, a.name), a.rechtsform && a.inhaber ? h('span', {}, `${a.rechtsform}, Inh. ${a.inhaber}`) : a.inhaber && h('span', {}, `Inh. ${a.inhaber}`), h('span', {}, a.strasse), h('span', {}, a.ort)),
      h('div', {}, a.telefon && h('span', {}, `Telefon ${a.telefon}`), a.email && h('span', {}, a.email), a.website && h('span', {}, a.website)),
      h('div', {}, konten.slice(0, 2).map((k) => [k.bank && h('span', {}, k.bank), h('span', {}, `IBAN ${k.iban}`), k.bic && h('span', {}, `BIC ${k.bic}`)])),
      h('div', {}, a.steuernummer && h('span', {}, `Steuernr. ${a.steuernummer}`), a.ustid && h('span', {}, `USt-IdNr. ${a.ustid}`), a.fusszeile && h('span', {}, a.fusszeile))));
}
export const gruss = () => [h('p', {}, 'Mit freundlichen Grüßen'), h('p', { class: 'vw-brief__unterschrift' }, absender().gruss || absender().name)];
const vorlage = () => h('p', { class: 'vw-warnung vw-nichtdrucken' }, 'Vorlage: Bitte prüfen Sie Inhalt, Beträge und Fristen vor dem Versand.');

/* ================= Schreiben an Mieter ================= */
routen.brief = (art, mieterId) => {
  const m = finde('mieter', mieterId);
  const einheit = m && finde('einheiten', m.einheitId);
  const objekt = einheit && finde('objekte', einheit.objektId);
  if (!m || !einheit || !objekt) return h('p', { class: 'vw-leer' }, 'Dieses Mietverhältnis gibt es nicht mehr. ', h('a', { href: '#/mieten' }, 'Zu den Mieten'));
  const an = [m.name, objekt.strasse || objekt.bezeichnung, objekt.ort];
  const offen = rueckstand(m);
  const frist = datum(datumPlus(heute(), 10));
  const mk = mietkonto(objekt.id);
  const konto = mk ? `auf das Konto ${mk.iban}${mk.inhaber ? ` (${mk.inhaber})` : ''}` : 'auf das Ihnen bekannte Konto';
  const bezug = `Mietverhältnis ${objekt.bezeichnung}, ${einheit.bezeichnung}`;

  if (art === 'uebergabe') {
    const zeile = (text: string) => h('tr', {}, h('td', {}, text), h('td', { class: 'vw-linie' }), h('td', { class: 'vw-linie' }));
    return h('div', { class: 'vw-stapel' }, werkzeug('#/liste/mieter'),
      dokument('Wohnungsübergabeprotokoll', `${bezug} · Formular zum Ausfüllen`,
        h('p', {}, `${bezug}${einheit.lage ? ` (${einheit.lage})` : ''}. Übergabe am: ____________   ☐ Einzug   ☐ Auszug`),
        h('h3', {}, 'Zählerstände'),
        h('table', { class: 'vw-brief__tabelle' }, h('thead', {}, h('tr', {}, h('th', {}, 'Zähler'), h('th', {}, 'Zählernummer'), h('th', {}, 'Stand'))),
          h('tbody', {}, ['Kaltwasser', 'Warmwasser', 'Strom', 'Gas', 'Heizung / Wärme'].map(zeile))),
        h('h3', {}, 'Zustand der Räume'),
        h('table', { class: 'vw-brief__tabelle' }, h('thead', {}, h('tr', {}, h('th', {}, 'Raum'), h('th', {}, 'In Ordnung'), h('th', {}, 'Mängel / Bemerkungen'))),
          h('tbody', {}, ['Flur', 'Wohnzimmer', 'Schlafzimmer', 'Kinderzimmer', 'Küche', 'Bad / WC', 'Balkon / Terrasse', 'Keller', 'Sonstiges'].map(zeile))),
        h('h3', {}, 'Schlüssel'),
        h('p', {}, 'Haustür: ____   Wohnungstür: ____   Briefkasten: ____   Keller: ____   Sonstige: ____'),
        h('h3', {}, 'Vereinbarungen'),
        h('p', { class: 'vw-brief__leer' }),
        h('div', { class: 'vw-brief__sign' }, h('span', {}, 'Ort, Datum'), h('span', {}, 'Mieter'), h('span', {}, 'Vermieter / Verwaltung'))));
  }

  const mahnung = art === 'mahnung';
  return h('div', { class: 'vw-stapel' }, werkzeug('#/mieten'), vorlage(),
    offen <= 0 && h('p', { class: 'vw-warnung vw-nichtdrucken' }, 'Bei diesem Mietverhältnis ist aktuell nichts offen.'),
    bogen(an, mahnung ? 'Mahnung – Mietrückstand' : 'Zahlungserinnerung',
      briefInfo(['Objekt', objekt.bezeichnung], ['Einheit', einheit.bezeichnung]),
      h('p', {}, `${bezug}`),
      h('p', {}, 'Sehr geehrte Damen und Herren,'),
      mahnung
        ? h('p', {}, `trotz Fälligkeit ist Ihr Mietkonto weiterhin nicht ausgeglichen. Zum heutigen Tag besteht ein Rückstand von ${geld(offen)}.`)
        : h('p', {}, `bei der Durchsicht unserer Unterlagen ist uns aufgefallen, dass auf Ihrem Mietkonto zum heutigen Tag ein Betrag von ${geld(offen)} offen ist. Sicher handelt es sich um ein Versehen.`),
      h('p', {}, `Bitte überweisen Sie den Betrag bis zum ${frist} ${konto}.`),
      mahnung && h('p', {}, 'Wir weisen darauf hin, dass ein Rückstand in Höhe von zwei Monatsmieten den Vermieter zur fristlosen Kündigung berechtigen kann. Sollten Sie den Betrag nicht in einer Summe begleichen können, sprechen Sie uns bitte umgehend an.'),
      h('p', {}, 'Sollte sich Ihre Zahlung mit diesem Schreiben überschnitten haben, betrachten Sie es bitte als gegenstandslos.'),
      ...gruss()));
};

/* ================= Angebot (Renovierung & Sanierung) ================= */
routen.angebot = (auftragId) => {
  const auftrag = finde('auftraege', auftragId);
  const objekt = auftrag && finde('objekte', auftrag.objektId);
  if (!auftrag || !objekt) return h('p', { class: 'vw-leer' }, 'Diesen Auftrag gibt es nicht mehr. ', h('a', { href: '#/liste/auftraege' }, 'Zu den Aufträgen'));
  const kunde = finde('kunden', objekt.kundeId);
  const einheit = finde('einheiten', auftrag.einheitId);
  const positionen = String(auftrag.leistungen ?? '').split('\n').map((z) => z.trim()).filter(Boolean);
  const belege = alle('kosten').filter((k) => k.auftragId === auftrag.id);
  return h('div', { class: 'vw-stapel' },
    werkzeug('#/liste/auftraege', h('button', { class: 'vw-knopf', onclick: () => {
      if (!kunde) return alert('Dem Objekt ist noch kein Kunde zugeordnet.');
      const r = speichere('rechnungen', { kundeId: kunde.id, objektId: objekt.id, datum: heute(), zeitraum: [auftrag.start, auftrag.ende].filter(Boolean).map((d: string) => datum(d)).join(' – '), positionen: `${auftrag.titel} gemäß Angebot | 1 | ${zahl(auftrag.angebot)}`, ust: absender().kleinunternehmer ? 0 : 19, status: 'Entwurf' });
      hinweis('Rechnungsentwurf angelegt');
      location.hash = `#/rechnung/${r.id}`;
    } }, 'Rechnung daraus erstellen')), vorlage(),
    belege.length > 0 && h('p', { class: 'vw-fein vw-nichtdrucken' }, `Diesem Auftrag sind ${belege.length} Beleg(e) über ${geld(belege.reduce((s, k) => s + zahl(k.betrag), 0))} zugeordnet.`),
    bogen([kunde?.name ?? 'Kunde nicht hinterlegt', kunde?.strasse, kunde?.ort], `Angebot: ${auftrag.titel}`,
      h('p', {}, `Objekt: ${objekt.bezeichnung}${einheit ? `, ${einheit.bezeichnung}` : ''} · ${auftrag.gewerk}`),
      h('p', {}, 'Sehr geehrte Damen und Herren,'),
      h('p', {}, 'vielen Dank für Ihre Anfrage. Für die folgenden Arbeiten bieten wir Ihnen an:'),
      positionen.length ? h('ol', {}, positionen.map((p) => h('li', {}, p))) : h('p', { class: 'vw-warnung vw-nichtdrucken' }, 'Im Auftrag ist noch kein Leistungsumfang eingetragen.'),
      h('p', { class: 'vw-brief__summe' }, 'Angebotssumme: ', h('strong', {}, zahl(auftrag.angebot) ? geld(auftrag.angebot) : '____________')),
      (auftrag.start || auftrag.ende) && h('p', {}, `Geplante Ausführung: ${datum(auftrag.start)} bis ${datum(auftrag.ende)}.`),
      h('p', {}, 'An dieses Angebot halten wir uns vier Wochen gebunden. Für Rückfragen stehen wir Ihnen gern zur Verfügung.'),
      ...gruss()));
};

/* ================= Eigentümerbericht ================= */
let berichtMonat = monatHeute();
let berichtJahr = false;
routen.bericht = (objektId) => {
  const objekt = finde('objekte', objektId);
  if (!objekt) return h('p', { class: 'vw-leer' }, 'Dieses Objekt gibt es nicht mehr. ', h('a', { href: '#/liste/objekte' }, 'Zur Objektliste'));
  const kunde = finde('kunden', objekt.kundeId);
  const jahr = berichtMonat.slice(0, 4);
  const imZeitraum = (d?: string) => !!d && (berichtJahr ? d.startsWith(jahr) : monatVon(d) === berichtMonat);
  const titel = berichtJahr ? `Jahr ${jahr}` : monatText(berichtMonat);
  const mieter = mieterVon(objekt.id);
  const einnahmen = alle('zahlungen').filter((z) => mieter.some((m) => m.id === z.mieterId) && (berichtJahr ? String(z.monat).startsWith(jahr) : z.monat === berichtMonat));
  const kosten = alle('kosten').filter((k) => k.objektId === objekt.id && imZeitraum(k.datum));
  const sumEin = einnahmen.reduce((s, z) => s + zahl(z.betrag), 0);
  const sumAus = kosten.reduce((s, k) => s + zahl(k.betrag), 0);
  const einsaetze = alle('einsaetze').filter((e) => e.objektId === objekt.id && imZeitraum(e.datum));
  const jeLeistung = new Map<string, number>();
  einsaetze.forEach((e) => jeLeistung.set(e.leistung, (jeLeistung.get(e.leistung) ?? 0) + 1));
  const meldungen = alle('vorgaenge').filter((v) => v.objektId === objekt.id && (imZeitraum(v.gemeldet) || v.status !== 'Erledigt'));
  const auftraege = alle('auftraege').filter((x) => x.objektId === objekt.id && x.status !== 'Abgeschlossen');
  const projekte = alle('projekte').filter((x) => x.objektId === objekt.id && x.phase !== 'Abgeschlossen');
  const stichMonat = berichtJahr && `${jahr}-12` < monatHeute() ? `${jahr}-12` : berichtJahr ? monatHeute() : berichtMonat;
  const leer = einheitenVon(objekt.id).filter((e) => (e.art === 'Wohnung' || e.art === 'Gewerbe') && !mieter.some((m) => m.einheitId === e.id && aktivIm(m, stichMonat)));
  const offen = mieter.map((m) => ({ m, betrag: rueckstand(m) })).filter((x) => x.betrag > 0);
  const tabelle = (kopf: string[], zeilen: (string | Node)[][], fuss?: (string | Node)[]) =>
    h('table', { class: 'vw-brief__tabelle' }, h('thead', {}, h('tr', {}, kopf.map((k, i) => h('th', { class: i === kopf.length - 1 ? 'vw-zahlspalte' : '' }, k)))),
      h('tbody', {}, zeilen.map((z) => h('tr', {}, z.map((c, i) => h('td', { class: i === z.length - 1 ? 'vw-zahlspalte' : '' }, c))))),
      fuss && h('tfoot', {}, h('tr', {}, fuss.map((c, i) => h('th', { class: i === fuss.length - 1 ? 'vw-zahlspalte' : '' }, c)))));

  const kostenJeArt = new Map<string, number>();
  kosten.forEach((k) => kostenJeArt.set(k.kostenart, (kostenJeArt.get(k.kostenart) ?? 0) + zahl(k.betrag)));

  return h('div', { class: 'vw-stapel' },
    werkzeug(`#/objekt/${objekt.id}`,
      h('button', { class: 'vw-knopf', 'aria-label': 'Zurück', onclick: () => { berichtMonat = monatPlus(berichtMonat, berichtJahr ? -12 : -1); zeichne(); } }, '←'),
      h('strong', {}, titel),
      h('button', { class: 'vw-knopf', 'aria-label': 'Vor', onclick: () => { berichtMonat = monatPlus(berichtMonat, berichtJahr ? 12 : 1); zeichne(); } }, '→'),
      h('button', { class: 'vw-knopf', onclick: () => { berichtJahr = !berichtJahr; zeichne(); } }, berichtJahr ? 'Monatsbericht' : 'Jahresbericht')),
    bogen([kunde?.name ?? 'Kunde nicht hinterlegt', kunde?.strasse, kunde?.ort], `Eigentümerbericht ${titel} – ${objekt.bezeichnung}`,
      briefInfo(['Kunden-Nr.', kunde?.kundennummer]),
      h('h3', {}, 'Einnahmen und Ausgaben'),
      tabelle(['Position', 'Betrag'], [
        ['Mieteingänge', geld(sumEin)],
        ...[...kostenJeArt].sort().map(([art, betrag]) => [art, geld(-betrag)] as (string | Node)[]),
      ], ['Überschuss', geld(sumEin - sumAus)]),
      h('h3', {}, 'Vermietung'),
      h('p', {}, leer.length ? `Leerstand: ${leer.map((e) => e.bezeichnung).join(', ')}.` : 'Alle Einheiten sind vermietet.'),
      offen.length ? tabelle(['Mietrückstände (Stand heute)', 'Betrag'], offen.map((x) => [`${x.m.name} · ${mahnstufe(x.m).text}`, geld(x.betrag)])) : h('p', {}, 'Es bestehen keine Mietrückstände.'),
      h('h3', {}, 'Service am Objekt'),
      jeLeistung.size ? tabelle(['Erbrachte Leistung', 'Einsätze'], [...jeLeistung].sort().map(([l, n]) => [l, String(n)])) : h('p', {}, 'Im Zeitraum wurden keine Einsätze dokumentiert.'),
      h('h3', {}, 'Meldungen und Schäden'),
      meldungen.length ? tabelle(['Meldung', 'Gemeldet', 'Status'], meldungen.map((v) => [v.titel, datum(v.gemeldet), v.status])) : h('p', {}, 'Keine Meldungen.'),
      (auftraege.length > 0 || projekte.length > 0) && h('h3', {}, 'Laufende Arbeiten und Projekte'),
      auftraege.length > 0 && tabelle(['Auftrag', 'Status', 'Angebot'], auftraege.map((x) => [x.titel, x.status, geld(x.angebot)])),
      projekte.length > 0 && tabelle(['Projekt', 'Phase', 'Budget'], projekte.map((x) => [x.titel, x.phase, geld(x.budget)])),
      ...gruss()));
};

/* ================= Kautionen ================= */
routen.kautionen = () => {
  const zeilen = ds('mieter').filter((m) => zahl(m.kautionSoll) > 0 || kautionBestand(m) > 0)
    .map((m) => ({ m, soll: zahl(m.kautionSoll), ist: kautionErhalten(m), bestand: kautionBestand(m), beendet: !!m.ende && m.ende < heute(), konto: finde('bankkonten', m.kautionKontoId) }));
  const laufend = zeilen.filter((z) => !z.beendet || z.bestand > 0.005);
  const jeKonto = new Map<string, number>();
  for (const z of laufend) jeKonto.set(z.konto?.bezeichnung ?? 'Ohne Kautionskonto', (jeKonto.get(z.konto?.bezeichnung ?? 'Ohne Kautionskonto') ?? 0) + z.bestand);
  return h('div', { class: 'vw-stapel' },
    h('header', { class: 'vw-seitenkopf' }, h('h1', {}, 'Kautionen'), h('p', {}, 'Jede Kaution mit ihren Buchungen und dem Konto, auf dem sie liegt. Ein Klick öffnet das Mietverhältnis.')),
    h('div', { class: 'vw-kennzahlen' },
      kennzahl(geld(laufend.reduce((s, z) => s + z.bestand, 0)), 'verwahrte Kautionen'),
      kennzahl(geld(zeilen.filter((z) => !z.beendet).reduce((s, z) => s + Math.max(0, z.soll - z.ist), 0)), 'noch nicht eingegangen', undefined, 'vw-kennzahl--gelb'),
      kennzahl(String(zeilen.filter((z) => z.beendet && z.bestand > 0.005).length), 'nach Auszug abzurechnen', undefined, 'vw-kennzahl--blau')),
    jeKonto.size > 0 && h('section', { class: 'vw-karte' }, h('header', { class: 'vw-karte__kopf' }, h('h2', {}, 'Bestand je Konto'), h('span', {}, 'zum Abgleich mit dem Kontoauszug')),
      h('dl', { class: 'vw-info vw-info--innen' }, [...jeKonto].map(([k, v]) => [h('dt', {}, k), h('dd', {}, h('strong', {}, geld(v)))]))),
    h('section', { class: 'vw-karte' }, h('div', { class: 'vw-tabelle' }, h('table', {},
      h('thead', {}, h('tr', {}, ['Einheit', 'Mieter', 'Vereinbart', 'Eingezahlt', 'Verwahrt', 'Konto', 'Stand'].map((t) => h('th', { scope: 'col' }, t)))),
      h('tbody', {}, zeilen.length ? zeilen.map((z) => h('tr', { tabindex: 0, onclick: () => (location.hash = `#/mietverhaeltnis/${z.m.id}`) },
        h('td', { 'data-spalte': 'Einheit' }, ARTEN.einheiten.anzeige(finde('einheiten', z.m.einheitId) ?? ({} as Satz))),
        h('td', { 'data-spalte': 'Mieter' }, z.m.name),
        h('td', { 'data-spalte': 'Vereinbart', class: 'vw-zahlspalte' }, geld(z.soll)),
        h('td', { 'data-spalte': 'Eingezahlt', class: 'vw-zahlspalte' }, geld(z.ist)),
        h('td', { 'data-spalte': 'Verwahrt', class: 'vw-zahlspalte' }, geld(z.bestand)),
        h('td', { 'data-spalte': 'Konto' }, z.konto?.bezeichnung ?? '–'),
        h('td', { 'data-spalte': 'Stand' }, z.beendet ? (z.bestand > 0.005 ? marke('Abrechnen', 'blau') : marke('Abgeschlossen', 'gruen')) : z.ist >= z.soll ? marke('Vollständig', 'gruen') : marke(`${geld(z.soll - z.ist)} offen`, 'gelb'))))
        : [h('tr', {}, h('td', { colspan: 7, class: 'vw-leer' }, 'Noch keine Kautionen erfasst.'))])))));
};

/* ================= Kalender ================= */
let kalMonat = monatHeute();
routen.kalender = () => {
  type Termin = { tag: string; text: string; art: string; farbe: string; ziel: string };
  const name = (id?: string) => finde('objekte', id)?.bezeichnung ?? '';
  const termine: Termin[] = [
    ...ds('fristen').filter((x) => !x.erledigt).map((x) => ({ tag: x.faellig, text: `${x.art} · ${name(x.objektId)}`, art: 'Frist', farbe: 'gelb', ziel: '#/liste/fristen' })),
    ...ds('service').filter((x) => x.rhythmus !== 'Nach Bedarf').map((x) => ({ tag: x.naechster, text: `${x.leistung} · ${name(x.objektId)}`, art: 'Dienst', farbe: 'blau', ziel: '#/tagesplan' })),
    ...ds('aufgaben').filter((x) => !x.erledigt && x.faellig).map((x) => ({ tag: x.faellig, text: x.titel, art: 'Aufgabe', farbe: 'grau', ziel: '#/aufgaben' })),
    ...ds('vertraege').filter((x) => x.kuendigenBis).map((x) => ({ tag: x.kuendigenBis, text: `Kündbar bis: ${x.art} · ${x.partner}`, art: 'Vertrag', farbe: 'gelb', ziel: '#/liste/vertraege' })),
    ...ds('auftraege').filter((x) => x.ende && x.status !== 'Abgeschlossen').map((x) => ({ tag: x.ende, text: `Geplantes Ende: ${x.titel}`, art: 'Auftrag', farbe: 'blau', ziel: '#/liste/auftraege' })),
    ...ds('projekte').filter((x) => x.ziel && x.phase !== 'Abgeschlossen').map((x) => ({ tag: x.ziel, text: `Fertigstellung: ${x.titel}`, art: 'Projekt', farbe: 'blau', ziel: '#/liste/projekte' })),
    ...ds('versammlungen').map((x) => ({ tag: x.datum, text: `${x.art} · ${name(x.objektId)}`, art: 'Versammlung', farbe: 'gruen', ziel: '#/liste/versammlungen' })),
    ...ds('mieter').filter((x) => x.ende).map((x) => ({ tag: x.ende, text: `Auszug: ${x.name}`, art: 'Auszug', farbe: 'rot', ziel: '#/liste/mieter' })),
  ].filter((t) => monatVon(t.tag) === kalMonat).sort((a, b) => a.tag.localeCompare(b.tag));
  const tage = [...new Set(termine.map((t) => t.tag))];
  return h('div', { class: 'vw-stapel' },
    h('header', { class: 'vw-seitenkopf' }, h('h1', {}, 'Kalender'), h('p', {}, 'Alle Termine aus allen vier Bereichen in einer Liste.')),
    h('div', { class: 'vw-reihe vw-monat' },
      h('button', { class: 'vw-knopf', 'aria-label': 'Vorheriger Monat', onclick: () => { kalMonat = monatPlus(kalMonat, -1); zeichne(); } }, '←'),
      h('strong', {}, monatText(kalMonat)),
      h('button', { class: 'vw-knopf', 'aria-label': 'Nächster Monat', onclick: () => { kalMonat = monatPlus(kalMonat, 1); zeichne(); } }, '→'),
      kalMonat !== monatHeute() && h('button', { class: 'vw-knopf', onclick: () => { kalMonat = monatHeute(); zeichne(); } }, 'Heute')),
    tage.length ? h('section', { class: 'vw-karte' }, tage.map((tag) => h('div', { class: `vw-tag ${tag === heute() ? 'vw-tag--heute' : ''}` },
      h('p', { class: 'vw-tag__datum' }, new Date(tag + 'T00:00:00Z').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' }), tag === heute() && ' · heute', tag < heute() && tageBis(tag) < 0 && h('small', {}, ' vergangen')),
      h('ul', { class: 'vw-punkte' }, termine.filter((t) => t.tag === tag).map((t) => h('li', {}, h('a', { href: t.ziel }, marke(t.art, t.farbe), h('span', { class: 'vw-punkte__text' }, t.text))))))))
      : h('p', { class: 'vw-leer' }, 'In diesem Monat gibt es keine Termine.'));
};

/* ================= Mieterwechsel-Assistent ================= */
aktionen.mieterwechsel = (m: Satz) => {
  const einheit = finde('einheiten', m.einheitId);
  const objektId = objektVonMieter(m);
  const dialog = h('dialog', { class: 'vw-dialog', 'aria-labelledby': 'vw-mw-titel' }) as HTMLDialogElement;
  const haken = (name: string, text: string, an = true) => h('label', { class: 'vw-haken' }, h('input', { type: 'checkbox', name, checked: an }), ' ', text);
  const fristText = h('small', {});
  /** Mietende nach § 573c BGB vorschlagen */
  const frist = () => {
    const durch = (form.querySelector('#mw-durch') as HTMLSelectElement).value;
    const eingang = (form.querySelector('#mw-eingang') as HTMLInputElement).value;
    const r = durch === 'Aufhebungsvertrag' ? null : kuendigungsEnde(eingang, durch, m.beginn);
    fristText.textContent = r ? `Frühestens zum ${datum(r.ende)} – ${r.text}` : 'Beim Aufhebungsvertrag gilt das vereinbarte Datum.';
    if (r) (form.querySelector('#mw-ende') as HTMLInputElement).value = r.ende;
  };
  const form = h('form', { method: 'dialog', class: 'vw-form' },
    h('header', { class: 'vw-dialog__kopf' }, h('h2', { id: 'vw-mw-titel' }, `Auszug: ${m.name}`), h('button', { type: 'button', class: 'vw-x', 'aria-label': 'Schließen', onclick: () => dialog.close() }, '×')),
    h('div', { class: 'vw-form__felder' },
      h('p', { class: 'feld--breit vw-fein' }, `${einheit ? ARTEN.einheiten.anzeige(einheit) : ''} – der Assistent beendet das Mietverhältnis und legt alles an, was danach zu tun ist. So greifen Verwalten, Betreuen und Erneuern ineinander.`),
      h('div', { class: 'feld' }, h('label', { for: 'mw-durch' }, 'Kündigung durch'),
        h('select', { id: 'mw-durch', name: 'durch', onchange: () => frist() }, ['Mieter', 'Vermieter', 'Aufhebungsvertrag'].map((o) => h('option', { value: o, selected: o === (m.kuendigungDurch || 'Mieter') }, o)))),
      h('div', { class: 'feld' }, h('label', { for: 'mw-eingang' }, 'Kündigung eingegangen am'), h('input', { id: 'mw-eingang', name: 'eingang', type: 'date', value: m.kuendigungEingang || heute(), oninput: () => frist() })),
      h('div', { class: 'feld' }, h('label', { for: 'mw-ende' }, 'Mietende *'), h('input', { id: 'mw-ende', name: 'ende', type: 'date', required: true, value: m.ende || heute() }), fristText),
      h('div', { class: 'feld' }, h('label', { for: 'mw-neu' }, 'Neue Anschrift (falls bekannt)'), h('textarea', { id: 'mw-neu', name: 'neu', rows: 2 }, m.anschriftNeu ?? '')),
      h('div', { class: 'feld feld--breit vw-mehr', style: 'display:grid' },
        haken('uebergabe', 'Aufgabe: Wohnungsübergabe mit Zählerständen und Schlüsseln'),
        haken('kaution', `Aufgabe: Kaution abrechnen (${geld(kautionBestand(m))} verwahrt)`, kautionBestand(m) > 0),
        haken('nk', 'Aufgabe: Nebenkosten bis zum Auszug abrechnen'),
        haken('renovierung', 'Renovierungsauftrag für die Wohnung anlegen'),
        haken('nachmieter', 'Aufgabe: Nachmieter suchen'),
        haken('kontrolle', 'Leerstandskontrolle in den Serviceplan aufnehmen', false))),
    h('footer', { class: 'vw-dialog__fuss' }, h('span', { class: 'vw-platz' }),
      h('button', { type: 'button', class: 'vw-knopf', onclick: () => dialog.close() }, 'Abbrechen'),
      h('button', { type: 'submit', class: 'vw-knopf vw-knopf--voll' }, 'Auszug anlegen'))) as HTMLFormElement;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const ende = String(d.get('ende'));
    if (!ende) return;
    const wo = einheit?.bezeichnung ?? 'Wohnung';
    const aufgabe = (titel: string, faellig: string) => speichere('aufgaben', { titel, objektId, faellig, zustaendigId: standardZustaendig(objektId), prioritaet: 'Normal', bereich: 'Verwalten' });
    speichere('mieter', { id: m.id, ende, kuendigungDurch: String(d.get('durch') || ''), kuendigungEingang: String(d.get('eingang') || ''), ...(String(d.get('neu') || '').trim() ? { anschriftNeu: String(d.get('neu')).trim() } : {}) });
    if (d.get('uebergabe')) aufgabe(`Übergabe ${wo}: Zählerstände, Schlüssel, Protokoll (${m.name})`, ende);
    if (d.get('kaution')) aufgabe(`Kaution abrechnen: ${m.name}`, datumPlus(ende, 90));
    if (d.get('nk')) aufgabe(`Nebenkosten bis Auszug abrechnen: ${m.name}`, datumPlus(ende, 60));
    if (d.get('nachmieter')) aufgabe(`Nachmieter suchen: ${wo}`, datumPlus(heute(), 7));
    if (d.get('renovierung')) speichere('auftraege', { objektId, einheitId: m.einheitId, titel: `Renovierung ${wo} nach Auszug`, gewerk: 'Wohnungsrenovierung', status: 'Anfrage', start: datumPlus(ende, 1) });
    if (d.get('kontrolle')) speichere('service', { objektId, leistung: 'Leerstandskontrolle', rhythmus: 'Wöchentlich', naechster: datumPlus(ende, 7), notiz: `${wo}: lüften, heizen, Wasser laufen lassen.` });
    dialog.close();
    hinweis('Auszug angelegt – Checkliste, Aufgaben und Auftrag sind eingetragen');
    location.hash = `#/mietverhaeltnis/${m.id}`;
  });
  dialog.append(form);
  dialog.addEventListener('close', () => { dialog.remove(); zeichne(); });
  document.body.append(dialog);
  dialog.showModal();
  if (!m.ende) frist();
};

/* ================= Rechnungen an Kunden ================= */
function naechsteNummer(): string {
  const jahr = heute().slice(0, 4);
  const vor = `RE-${jahr}-`;
  const hoechste = Math.max(0, ...alle('rechnungen').map((r) => (String(r.nummer ?? '').startsWith(vor) ? Number(String(r.nummer).slice(vor.length)) || 0 : 0)));
  return vor + String(hoechste + 1).padStart(4, '0');
}
/** Aus dem Entwurf wird eine gestellte Rechnung: Nummer, Datum und Zahlungsziel werden gesetzt. */
function stelle(r: Satz) {
  const ziel = zahl(absender().zahlungsziel) || 14;
  speichere('rechnungen', { id: r.id, nummer: r.nummer || naechsteNummer(), status: 'Offen', datum: r.datum || heute(), faellig: r.faellig || datumPlus(heute(), ziel) });
  hinweis('Rechnung gestellt');
}

let laufMonat = monatPlus(monatHeute(), -1);
/** Erzeugt für einen Monat Entwürfe aus den Preisvereinbarungen und den dokumentierten Einsätzen. */
function rechnungslauf() {
  const a = absender();
  let neu = 0;
  const ohneKunde: string[] = [];
  for (const objekt of alle('objekte')) {
    const vb = alle('vereinbarungen').filter((v) => v.objektId === objekt.id && v.aktiv);
    if (!vb.length) continue;
    if (!finde('kunden', objekt.kundeId)) { ohneKunde.push(objekt.bezeichnung); continue; }
    if (alle('rechnungen').some((r) => r.objektId === objekt.id && r.lauf === laufMonat && r.status !== 'Storniert')) continue;
    const einheiten = einheitenVon(objekt.id).length;
    const zeilen = vb.map((v) => {
      const menge = v.abrechnung === 'Je Einheit und Monat' ? einheiten
        : v.abrechnung === 'Je dokumentiertem Einsatz' ? alle('einsaetze').filter((e) => e.objektId === objekt.id && monatVon(e.datum) === laufMonat && e.leistung === (v.einsatzLeistung || v.leistung)).length
        : 1;
      return menge > 0 ? `${v.leistung} | ${menge} | ${zahl(v.preis).toFixed(2).replace('.', ',')}` : '';
    }).filter(Boolean);
    if (!zeilen.length) continue;
    speichere('rechnungen', { kundeId: objekt.kundeId, objektId: objekt.id, datum: heute(), zeitraum: monatText(laufMonat), lauf: laufMonat, positionen: zeilen.join('\n'), ust: a.kleinunternehmer ? 0 : 19, status: 'Entwurf' });
    neu++;
  }
  hinweis(neu ? `${neu} Rechnungsentwurf/-entwürfe für ${monatText(laufMonat)} angelegt` : `Für ${monatText(laufMonat)} gibt es nichts Neues abzurechnen`);
  if (ohneKunde.length) alert(`Ohne Rechnung, weil kein Kunde zugeordnet ist: ${ohneKunde.join(', ')}`);
}

routen.rechnungen = () => {
  const alleR = ds('rechnungen');
  const offen = alleR.filter((r) => r.status === 'Offen');
  const jahr = heute().slice(0, 4);
  const summe = (liste: Satz[], feld: 'netto' | 'brutto') => liste.reduce((s, r) => s + rechnungSumme(r)[feld], 0);
  return h('div', { class: 'vw-stapel' },
    h('header', { class: 'vw-seitenkopf' }, h('h1', {}, 'Rechnungen'), h('p', {}, 'Ihre eigenen Leistungen aus allen vier Bereichen, abgerechnet gegenüber dem Kunden.')),
    h('div', { class: 'vw-kennzahlen' },
      kennzahl(geld(summe(offen, 'brutto')), `offen (${offen.length})`, undefined, offen.length ? 'vw-kennzahl--gelb' : ''),
      kennzahl(geld(summe(offen.filter(rechnungUeberfaellig), 'brutto')), 'davon überfällig', undefined, offen.some(rechnungUeberfaellig) ? 'vw-kennzahl--rot' : ''),
      kennzahl(String(alleR.filter((r) => r.status === 'Entwurf').length), 'Entwürfe'),
      kennzahl(geld(summe(alleR.filter((r) => ['Offen', 'Bezahlt'].includes(r.status) && String(r.datum).startsWith(jahr)), 'netto')), `Umsatz netto ${jahr}`)),
    h('section', { class: 'vw-karte vw-text' },
      h('h2', {}, 'Rechnungslauf'),
      h('p', {}, 'Erzeugt für jedes Objekt mit Preisvereinbarungen einen Entwurf: Pauschalen, Beträge je Einheit und die im Monat dokumentierten Einsätze. Bereits abgerechnete Objekte werden übersprungen.'),
      h('div', { class: 'vw-reihe vw-monat' },
        h('button', { class: 'vw-knopf', 'aria-label': 'Vorheriger Monat', onclick: () => { laufMonat = monatPlus(laufMonat, -1); zeichne(); } }, '←'),
        h('strong', {}, monatText(laufMonat)),
        h('button', { class: 'vw-knopf', 'aria-label': 'Nächster Monat', onclick: () => { laufMonat = monatPlus(laufMonat, 1); zeichne(); } }, '→'),
        h('button', { class: 'vw-knopf vw-knopf--voll', onclick: rechnungslauf }, 'Entwürfe erzeugen'),
        h('a', { class: 'vw-knopf', href: '#/liste/vereinbarungen' }, 'Preisvereinbarungen'))),
    liste('rechnungen', { vorgaben: { datum: heute(), ust: absender().kleinunternehmer ? 0 : 19 } }));
};

routen.rechnung = (id) => {
  const r = finde('rechnungen', id);
  const kunde = r && finde('kunden', r.kundeId);
  if (!r) return h('p', { class: 'vw-leer' }, 'Diese Rechnung gibt es nicht mehr. ', h('a', { href: '#/rechnungen' }, 'Zu den Rechnungen'));
  const a = absender();
  const objekt = finde('objekte', r.objektId);
  const pos = positionen(r);
  const s = rechnungSumme(r);
  const konto = rechnungskonten()[0];
  const fehlt = [!a.steuernummer && !a.ustid && 'Steuernummer oder USt-IdNr.', !konto && 'Bankverbindung (Administration → Unternehmen)', !kunde?.strasse && 'Anschrift des Kunden', !r.zeitraum && 'Leistungszeitraum'].filter(Boolean);
  return h('div', { class: 'vw-stapel' },
    werkzeug('#/rechnungen',
      marke(r.status),
      h('button', { class: 'vw-knopf', onclick: () => formular('rechnungen', r) }, 'Bearbeiten'),
      r.status === 'Entwurf' && h('button', { class: 'vw-knopf vw-knopf--voll', onclick: () => stelle(r) }, 'Rechnung stellen'),
      r.status === 'Offen' && h('button', { class: 'vw-knopf vw-knopf--voll', onclick: () => { speichere('rechnungen', { id: r.id, status: 'Bezahlt', bezahltAm: heute() }); hinweis('Als bezahlt gebucht'); } }, 'Zahlung eingegangen')),
    fehlt.length > 0 && h('p', { class: 'vw-warnung vw-nichtdrucken' }, `Für eine vollständige Rechnung fehlt noch: ${fehlt.join(', ')}.`),
    r.status === 'Entwurf' && h('p', { class: 'vw-fein vw-nichtdrucken' }, 'Entwurf: Die Rechnungsnummer wird vergeben, sobald Sie die Rechnung stellen.'),
    bogen([kunde?.name ?? 'Kunde nicht hinterlegt', kunde?.strasse, kunde?.ort], r.status === 'Storniert' ? `Rechnung ${r.nummer ?? ''} (storniert)` : `Rechnung ${r.nummer || '– Entwurf –'}`,
      briefInfo(['Rechnungs-Nr.', r.nummer || 'Entwurf'], ['Kunden-Nr.', kunde?.kundennummer], ['Objekt', objekt?.bezeichnung], ['Rechnungsdatum', datum(r.datum)]),
      r.zeitraum && h('p', {}, `Leistungszeitraum: ${r.zeitraum}`),
      h('table', { class: 'vw-brief__tabelle' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Pos.'), h('th', {}, 'Leistung'), h('th', { class: 'vw-zahlspalte' }, 'Menge'), h('th', { class: 'vw-zahlspalte' }, 'Einzelpreis'), h('th', { class: 'vw-zahlspalte' }, 'Gesamt'))),
        h('tbody', {}, pos.map((p, i) => h('tr', {}, h('td', {}, String(i + 1)), h('td', {}, p.text), h('td', { class: 'vw-zahlspalte' }, String(p.menge).replace('.', ',')), h('td', { class: 'vw-zahlspalte' }, geld(p.einzel)), h('td', { class: 'vw-zahlspalte' }, geld(p.summe))))),
        h('tfoot', {},
          h('tr', {}, h('td', { colspan: 4 }, 'Summe netto'), h('td', { class: 'vw-zahlspalte' }, geld(s.netto))),
          s.satz > 0 && h('tr', {}, h('td', { colspan: 4 }, `zuzüglich ${String(s.satz).replace('.', ',')} % Umsatzsteuer`), h('td', { class: 'vw-zahlspalte' }, geld(s.ust))),
          h('tr', {}, h('th', { colspan: 4 }, 'Rechnungsbetrag'), h('th', { class: 'vw-zahlspalte' }, geld(s.brutto))))),
      s.satz === 0 && a.kleinunternehmer && h('p', {}, 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.'),
      r.status !== 'Bezahlt'
        ? h('p', {}, `Bitte überweisen Sie den Rechnungsbetrag${r.faellig ? ` bis zum ${datum(r.faellig)}` : ''}${konto ? ` auf das Konto ${konto.iban}${konto.inhaber ? ` (${konto.inhaber})` : ''}` : ''}${r.nummer ? ` unter Angabe der Rechnungsnummer ${r.nummer}` : ''}.`)
        : h('p', {}, `Der Rechnungsbetrag wurde am ${datum(r.bezahltAm)} beglichen. Vielen Dank.`),
      r.notiz && h('p', {}, r.notiz),
      ...gruss()));
};
