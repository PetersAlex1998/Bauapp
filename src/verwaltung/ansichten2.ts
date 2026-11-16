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
import { alle, finde, heute, speichere, type Satz } from './speicher';
import { ARTEN } from './schema';
import { aktivIm, datumPlus, einheitenVon, mahnstufe, mieterVon, monatHeute, monatPlus, monatVon, objektVonMieter, rueckstand, soll, tageBis, zahl } from './rechnen';
import { aktionen, datum, formular, geld, h, hinweis, kennzahl, marke, monatText, routen, zeichne } from './app';

const absender = (): Satz =>
  alle('absender')[0] ?? ({ id: '', name: 'HaDie-Immobilien', strasse: 'Detmolder Straße 142', ort: '33175 Bad Lippspringe', telefon: '0160 9500 6184' } as Satz);

const werkzeug = (zurueck: string, ...mehr: Node[]) =>
  h('div', { class: 'vw-reihe vw-nichtdrucken' },
    h('a', { class: 'vw-knopf', href: zurueck }, '← Zurück'), ...mehr, h('span', { class: 'vw-platz' }),
    !alle('absender').length && h('a', { class: 'vw-knopf', href: '#/liste/absender' }, 'Absender & Bank hinterlegen'),
    h('button', { class: 'vw-knopf vw-knopf--voll', onclick: () => window.print() }, 'Drucken / als PDF'));

/** Briefbogen mit Absender, Empfänger, Datum und Betreff */
function bogen(empfaenger: (string | undefined)[], betreff: string, ...inhalt: (Node | string | false | null | undefined)[]): HTMLElement {
  const a = absender();
  return h('article', { class: 'vw-brief' },
    h('p', { class: 'vw-brief__absender' }, [a.name, a.strasse, a.ort].filter(Boolean).join(' · ')),
    h('address', { class: 'vw-brief__an' }, empfaenger.filter(Boolean).map((z) => h('span', {}, z!))),
    h('p', { class: 'vw-brief__datum' }, `${(a.ort ?? '').replace(/^\d+\s*/, '')}, ${datum(heute())}`),
    h('h2', {}, betreff),
    ...inhalt,
    h('footer', { class: 'vw-brief__fuss' },
      [a.name, a.strasse, a.ort].filter(Boolean).join(' · '), h('br'),
      [a.telefon && `Telefon ${a.telefon}`, a.email].filter(Boolean).join(' · '),
      a.iban && [h('br'), [a.inhaber && `Kontoinhaber ${a.inhaber}`, `IBAN ${a.iban}`, a.bank].filter(Boolean).join(' · ')]));
}
const gruss = () => [h('p', {}, 'Mit freundlichen Grüßen'), h('p', { class: 'vw-brief__unterschrift' }, absender().gruss || absender().name)];
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
  const a = absender();
  const konto = a.iban ? `auf das Konto ${a.iban}${a.inhaber ? ` (${a.inhaber})` : ''}` : 'auf das Ihnen bekannte Konto';
  const bezug = `Mietverhältnis ${objekt.bezeichnung}, ${einheit.bezeichnung}`;

  if (art === 'uebergabe') {
    const zeile = (text: string) => h('tr', {}, h('td', {}, text), h('td', { class: 'vw-linie' }), h('td', { class: 'vw-linie' }));
    return h('div', { class: 'vw-stapel' }, werkzeug('#/liste/mieter'),
      bogen(an, 'Wohnungsübergabeprotokoll',
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
  return h('div', { class: 'vw-stapel' }, werkzeug('#/liste/auftraege'), vorlage(),
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
  const zeilen = alle('mieter').map((m) => ({ m, soll: zahl(m.kautionSoll), ist: zahl(m.kautionIst), beendet: !!m.ende && m.ende < heute() }));
  const laufend = zeilen.filter((z) => !z.beendet);
  return h('div', { class: 'vw-stapel' },
    h('header', { class: 'vw-seitenkopf' }, h('h1', {}, 'Kautionen'), h('p', {}, 'Vereinbarte und erhaltene Kautionen. Nach Auszug steht die Abrechnung an.')),
    h('div', { class: 'vw-kennzahlen' },
      kennzahl(geld(laufend.reduce((s, z) => s + z.ist, 0)), 'verwaltete Kautionen'),
      kennzahl(geld(laufend.reduce((s, z) => s + Math.max(0, z.soll - z.ist), 0)), 'noch nicht eingegangen', undefined, 'vw-kennzahl--gelb'),
      kennzahl(String(zeilen.filter((z) => z.beendet && z.ist > 0).length), 'nach Auszug abzurechnen', undefined, 'vw-kennzahl--blau')),
    h('section', { class: 'vw-karte' }, h('div', { class: 'vw-tabelle' }, h('table', {},
      h('thead', {}, h('tr', {}, ['Einheit', 'Mieter', 'Vereinbart', 'Erhalten', 'Stand'].map((t) => h('th', { scope: 'col' }, t)))),
      h('tbody', {}, zeilen.length ? zeilen.map((z) => h('tr', { tabindex: 0, onclick: () => formular('mieter', z.m) },
        h('td', { 'data-spalte': 'Einheit' }, ARTEN.einheiten.anzeige(finde('einheiten', z.m.einheitId) ?? ({} as Satz))),
        h('td', { 'data-spalte': 'Mieter' }, z.m.name),
        h('td', { 'data-spalte': 'Vereinbart', class: 'vw-zahlspalte' }, geld(z.soll)),
        h('td', { 'data-spalte': 'Erhalten', class: 'vw-zahlspalte' }, geld(z.ist)),
        h('td', { 'data-spalte': 'Stand' }, z.beendet ? (z.ist > 0 ? marke('Abrechnen', 'blau') : marke('Abgeschlossen', 'gruen')) : z.ist >= z.soll ? marke('Vollständig', 'gruen') : marke(`${geld(z.soll - z.ist)} offen`, 'gelb'))))
        : [h('tr', {}, h('td', { colspan: 5, class: 'vw-leer' }, 'Noch keine Mietverhältnisse angelegt.'))])))));
};

/* ================= Kalender ================= */
let kalMonat = monatHeute();
routen.kalender = () => {
  type Termin = { tag: string; text: string; art: string; farbe: string; ziel: string };
  const name = (id?: string) => finde('objekte', id)?.bezeichnung ?? '';
  const termine: Termin[] = [
    ...alle('fristen').filter((x) => !x.erledigt).map((x) => ({ tag: x.faellig, text: `${x.art} · ${name(x.objektId)}`, art: 'Frist', farbe: 'gelb', ziel: '#/liste/fristen' })),
    ...alle('service').filter((x) => x.rhythmus !== 'Nach Bedarf').map((x) => ({ tag: x.naechster, text: `${x.leistung} · ${name(x.objektId)}`, art: 'Dienst', farbe: 'blau', ziel: '#/tagesplan' })),
    ...alle('aufgaben').filter((x) => !x.erledigt && x.faellig).map((x) => ({ tag: x.faellig, text: x.titel, art: 'Aufgabe', farbe: 'grau', ziel: '#/liste/aufgaben' })),
    ...alle('vertraege').filter((x) => x.kuendigenBis).map((x) => ({ tag: x.kuendigenBis, text: `Kündbar bis: ${x.art} · ${x.partner}`, art: 'Vertrag', farbe: 'gelb', ziel: '#/liste/vertraege' })),
    ...alle('auftraege').filter((x) => x.ende && x.status !== 'Abgeschlossen').map((x) => ({ tag: x.ende, text: `Geplantes Ende: ${x.titel}`, art: 'Auftrag', farbe: 'blau', ziel: '#/liste/auftraege' })),
    ...alle('projekte').filter((x) => x.ziel && x.phase !== 'Abgeschlossen').map((x) => ({ tag: x.ziel, text: `Fertigstellung: ${x.titel}`, art: 'Projekt', farbe: 'blau', ziel: '#/liste/projekte' })),
    ...alle('versammlungen').map((x) => ({ tag: x.datum, text: `${x.art} · ${name(x.objektId)}`, art: 'Versammlung', farbe: 'gruen', ziel: '#/liste/versammlungen' })),
    ...alle('mieter').filter((x) => x.ende).map((x) => ({ tag: x.ende, text: `Auszug: ${x.name}`, art: 'Auszug', farbe: 'rot', ziel: '#/liste/mieter' })),
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
  const form = h('form', { method: 'dialog', class: 'vw-form' },
    h('header', { class: 'vw-dialog__kopf' }, h('h2', { id: 'vw-mw-titel' }, `Auszug: ${m.name}`), h('button', { type: 'button', class: 'vw-x', 'aria-label': 'Schließen', onclick: () => dialog.close() }, '×')),
    h('div', { class: 'vw-form__felder' },
      h('p', { class: 'feld--breit vw-fein' }, `${einheit ? ARTEN.einheiten.anzeige(einheit) : ''} – der Assistent beendet das Mietverhältnis und legt alles an, was danach zu tun ist. So greifen Verwalten, Betreuen und Erneuern ineinander.`),
      h('div', { class: 'feld' }, h('label', { for: 'mw-ende' }, 'Mietende *'), h('input', { id: 'mw-ende', name: 'ende', type: 'date', required: true, value: heute() })),
      h('div', { class: 'feld feld--breit vw-mehr', style: 'display:grid' },
        haken('uebergabe', 'Aufgabe: Wohnungsübergabe mit Zählerständen und Schlüsseln'),
        haken('kaution', `Aufgabe: Kaution abrechnen (${geld(m.kautionIst)} erhalten)`, zahl(m.kautionIst) > 0),
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
    const aufgabe = (titel: string, faellig: string) => speichere('aufgaben', { titel, objektId, faellig });
    speichere('mieter', { id: m.id, ende });
    if (d.get('uebergabe')) aufgabe(`Übergabe ${wo}: Zählerstände, Schlüssel, Protokoll (${m.name})`, ende);
    if (d.get('kaution')) aufgabe(`Kaution abrechnen: ${m.name}`, datumPlus(ende, 90));
    if (d.get('nk')) aufgabe(`Nebenkosten bis Auszug abrechnen: ${m.name}`, datumPlus(ende, 60));
    if (d.get('nachmieter')) aufgabe(`Nachmieter suchen: ${wo}`, datumPlus(heute(), 7));
    if (d.get('renovierung')) speichere('auftraege', { objektId, einheitId: m.einheitId, titel: `Renovierung ${wo} nach Auszug`, gewerk: 'Wohnungsrenovierung', status: 'Anfrage', start: datumPlus(ende, 1) });
    if (d.get('kontrolle')) speichere('service', { objektId, leistung: 'Leerstandskontrolle', rhythmus: 'Wöchentlich', naechster: datumPlus(ende, 7), notiz: `${wo}: lüften, heizen, Wasser laufen lassen.` });
    dialog.close();
    hinweis('Auszug angelegt – Aufgaben und Auftrag sind eingetragen');
    location.hash = `#/brief/uebergabe/${m.id}`;
  });
  dialog.append(form);
  dialog.addEventListener('close', () => { dialog.remove(); zeichne(); });
  document.body.append(dialog);
  dialog.showModal();
};
