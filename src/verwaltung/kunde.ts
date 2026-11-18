/**
 * KUNDENBEREICH
 * ---------------------------------------------------------------
 * Ansicht für Eigentümer nach der Anmeldung. Der Server liefert nur, was dem
 * Kunden gehört (seine Objekte, gestellte Rechnungen, Meldungen, Aufträge,
 * Projekte, Dokumentenregister und seine Ansprechpartner). Mieterdaten und
 * interne Notizen erhält der Browser nie. Der Kunde kann Meldungen anlegen,
 * sonst nichts ändern.
 */
import { druckrahmen } from './druck';
import { alle, finde, heute, ladeVomServer } from './speicher';
import { api } from './cloud';
import { positionen, rechnungSumme, zahl } from './rechnen';
import { datum, geld, h, kennzahl, marke } from './app';
import { balkenListe, mieteingangDiagramm, type MonatsWert } from './diagramme';
import { bogen, briefInfo } from './ansichten2';

let wurzelEl: HTMLElement;
let nummer = '';
let beenden: () => void;
let rechnungId = '';
let objektFilter = ''; // '' = alle Objekte

const firma = () => alle('absender')[0];
const tel = (s?: string) => (s ?? '').replace(/[^\d+]/g, '');

function meldungFormular() {
  const objekte = alle('objekte');
  const d = h('dialog', { class: 'vw-dialog' }) as HTMLDialogElement;
  const objekt = h('select', { id: 'm-objekt', required: true }, objekte.length > 1 && h('option', { value: '' }, 'Bitte wählen'),
    objekte.map((o) => h('option', { value: o.id }, o.bezeichnung))) as HTMLSelectElement;
  const kategorie = h('select', { id: 'm-kat' }, ['Schaden', 'Störung', 'Anfrage', 'Beschwerde', 'Notfall'].map((k) => h('option', { value: k }, k))) as HTMLSelectElement;
  const titel = h('input', { id: 'm-titel', type: 'text', maxlength: 200, required: true, placeholder: 'z. B. Heizung im Treppenhaus ausgefallen' }) as HTMLInputElement;
  const text = h('textarea', { id: 'm-text', rows: 4, maxlength: 4000 }) as HTMLTextAreaElement;
  const fehler = h('p', { class: 'formular__status', role: 'alert', 'data-art': 'fehler', style: 'grid-column:1/-1' });
  const hinweis = h('p', { class: 'vw-warnung', style: 'grid-column:1/-1', hidden: true }, 'Bei akuter Gefahr (Wasser, Gas, Feuer) rufen Sie uns bitte sofort an: ',
    h('a', { href: `tel:${tel(firma()?.telefon)}` }, firma()?.telefon ?? ''));
  kategorie.addEventListener('change', () => { hinweis.hidden = kategorie.value !== 'Notfall'; });
  const senden = h('button', { type: 'button', class: 'vw-knopf vw-knopf--voll', onclick: async () => {
    if (!objekt.value) { fehler.textContent = 'Bitte wählen Sie das Objekt.'; return; }
    if (titel.value.trim().length < 3) { fehler.textContent = 'Bitte beschreiben Sie kurz, worum es geht.'; return; }
    senden.setAttribute('disabled', '');
    const a = await api('melden', { id: 'kd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8), daten: { objektId: objekt.value, titel: titel.value, kategorie: kategorie.value, beschreibung: text.value } });
    senden.removeAttribute('disabled');
    if (!a.json?.ok) { fehler.textContent = a.json?.fehler || 'Die Meldung konnte nicht gesendet werden. Bitte rufen Sie uns an.'; return; }
    await ladeVomServer();
    d.close();
    zeichne();
  } }, 'Meldung senden');
  const feld = (label: string, el: HTMLElement) => h('div', { class: 'feld feld--breit' }, h('label', {}, label), el);
  d.append(h('div', { class: 'vw-form' },
    h('header', { class: 'vw-dialog__kopf' }, h('h2', {}, 'Meldung an die Verwaltung'), h('button', { type: 'button', class: 'vw-x', 'aria-label': 'Schließen', onclick: () => d.close() }, '×')),
    h('div', { class: 'vw-form__felder' }, feld('Objekt *', objekt), feld('Worum geht es? *', kategorie), feld('Kurzbeschreibung *', titel), feld('Weitere Angaben', text), hinweis, fehler),
    h('footer', { class: 'vw-dialog__fuss' }, h('span', { class: 'vw-platz' }), h('button', { type: 'button', class: 'vw-knopf', onclick: () => d.close() }, 'Abbrechen'), senden)));
  d.addEventListener('close', () => d.remove());
  document.body.append(d);
  d.showModal();
}

function rechnungAnsicht(id: string): HTMLElement {
  const r = finde('rechnungen', id);
  const a = firma();
  const kunde = alle('kunden')[0];
  if (!r) return h('p', { class: 'vw-leer' }, 'Diese Rechnung gibt es nicht.');
  const s = rechnungSumme(r);
  const konto = alle('bankkonten')[0] ?? (a?.iban ? { iban: a.iban, inhaber: a.inhaber } : undefined);
  return h('div', { class: 'vw-stapel' },
    h('div', { class: 'vw-reihe vw-nichtdrucken' },
      h('button', { class: 'vw-knopf', onclick: () => { rechnungId = ''; zeichne(); wurzelEl.scrollIntoView({ block: 'start' }); } }, '← Zurück'), h('span', { class: 'vw-platz' }),
      h('button', { class: 'vw-knopf vw-knopf--voll', onclick: () => window.print() }, 'Drucken / PDF')),
    bogen([kunde?.name, kunde?.strasse, kunde?.ort], `Rechnung ${r.nummer ?? ''}`,
      briefInfo(['Rechnungs-Nr.', r.nummer], ['Kunden-Nr.', kunde?.kundennummer], ['Rechnungsdatum', datum(r.datum)]),
      r.zeitraum && h('p', {}, `Leistungszeitraum: ${r.zeitraum}`),
      h('table', { class: 'vw-brief__tabelle' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Pos.'), h('th', {}, 'Leistung'), h('th', { class: 'vw-zahlspalte' }, 'Menge'), h('th', { class: 'vw-zahlspalte' }, 'Einzelpreis'), h('th', { class: 'vw-zahlspalte' }, 'Gesamt'))),
        h('tbody', {}, positionen(r).map((p, i) => h('tr', {}, h('td', {}, String(i + 1)), h('td', {}, p.text), h('td', { class: 'vw-zahlspalte' }, String(p.menge).replace('.', ',')), h('td', { class: 'vw-zahlspalte' }, geld(p.einzel)), h('td', { class: 'vw-zahlspalte' }, geld(p.summe))))),
        h('tfoot', {}, h('tr', {}, h('td', { colspan: 4 }, 'Summe netto'), h('td', { class: 'vw-zahlspalte' }, geld(s.netto))),
          s.satz > 0 && h('tr', {}, h('td', { colspan: 4 }, `zuzüglich ${String(s.satz).replace('.', ',')} % Umsatzsteuer`), h('td', { class: 'vw-zahlspalte' }, geld(s.ust))),
          h('tr', {}, h('th', { colspan: 4 }, 'Rechnungsbetrag'), h('th', { class: 'vw-zahlspalte' }, geld(s.brutto))))),
      r.status === 'Bezahlt'
        ? h('p', {}, `Der Rechnungsbetrag wurde am ${datum(r.bezahltAm)} beglichen. Vielen Dank.`)
        : h('p', {}, `Bitte überweisen Sie den Rechnungsbetrag${r.faellig ? ` bis zum ${datum(r.faellig)}` : ''}${konto?.iban ? ` auf das Konto ${konto.iban}${konto.inhaber ? ` (${konto.inhaber})` : ''}` : ''}${r.nummer ? ` unter Angabe der Rechnungsnummer ${r.nummer}` : ''}.`),
      r.notiz && h('p', {}, r.notiz),
      h('p', {}, 'Mit freundlichen Grüßen'), h('p', {}, a?.gruss || a?.name || '')));
}

function liste(titel: string, zeilen: Node[], leer: string) {
  return h('section', { class: 'vw-karte' }, h('header', { class: 'vw-karte__kopf' }, h('h2', {}, titel, ' ', h('span', { class: 'vw-zahl' }, String(zeilen.length)))),
    zeilen.length ? h('ul', { class: 'vw-punkte' }, zeilen) : h('p', { class: 'vw-leer' }, leer));
}

function ansicht(): HTMLElement {
  if (rechnungId) return rechnungAnsicht(rechnungId);
  const kunde = alle('kunden')[0];
  const objekte = alle('objekte');
  const rechnungen = [...alle('rechnungen')].sort((a, b) => String(b.datum).localeCompare(String(a.datum)));
  const offenSumme = rechnungen.filter((r) => r.status === 'Offen').reduce((s, r) => s + rechnungSumme(r).brutto, 0);
  const meldungen = [...alle('vorgaenge')].sort((a, b) => String(b.gemeldet).localeCompare(String(a.gemeldet)));
  const arbeiten = [...alle('auftraege').filter((x) => x.status !== 'Abgeschlossen'), ...alle('projekte').filter((x) => x.phase !== 'Abgeschlossen')];
  const team = alle('mitarbeiter');
  const objName = (id: string) => finde('objekte', id)?.bezeichnung ?? '';

  // Kennzahlen (vom Server nur als Summen je Objekt geliefert – ohne Mieterdaten)
  const auswertung = (alle('auswertung') as unknown as Record<string, { einheiten: number; vermietet: number; monate: MonatsWert[] }>) || {};
  const gewaehlt = objekte.filter((o) => !objektFilter || o.id === objektFilter);
  const teile = gewaehlt.map((o) => auswertung[o.id]).filter(Boolean);
  const monate: MonatsWert[] = (teile[0]?.monate ?? []).map((m, i) => ({ monat: m.monat, ist: teile.reduce((a, t) => a + (t.monate[i]?.ist ?? 0), 0), soll: teile.reduce((a, t) => a + (t.monate[i]?.soll ?? 0), 0) }));
  const dieser = monate[monate.length - 1];
  const einheitenSumme = teile.reduce((a, t) => a + t.einheiten, 0);
  const vermietetSumme = teile.reduce((a, t) => a + t.vermietet, 0);
  const jahr = heute().slice(0, 4);
  const kostenNachArt = new Map<string, number>();
  alle('kosten').filter((k) => String(k.datum ?? '').startsWith(jahr) && (!objektFilter || k.objektId === objektFilter) && gewaehlt.some((o) => o.id === k.objektId))
    .forEach((k) => kostenNachArt.set(k.kostenart || 'Sonstiges', (kostenNachArt.get(k.kostenart || 'Sonstiges') ?? 0) + zahl(k.betrag)));
  let kostenListe = [...kostenNachArt].map(([name, wert]) => ({ name, wert })).sort((a, b) => b.wert - a.wert);
  if (kostenListe.length > 6) kostenListe = [...kostenListe.slice(0, 5), { name: 'Übrige', wert: kostenListe.slice(5).reduce((a, e) => a + e.wert, 0) }];
  const monatName = dieser ? new Date(`${dieser.monat}-01T00:00:00Z`).toLocaleDateString('de-DE', { month: 'long', timeZone: 'UTC' }) : '';

  return h('div', { class: 'vw-stapel' },
    h('header', { class: 'vw-reihe', style: 'justify-content:space-between;align-items:end' },
      h('div', { class: 'vw-seitenkopf' }, h('h1', {}, `Guten Tag${kunde ? `, ${kunde.name}` : ''}.`), h('p', {}, `Kundennummer ${nummer} · Hier sehen Sie, was rund um Ihre Immobilien geschieht.`)),
      h('div', { class: 'vw-reihe' }, h('button', { class: 'vw-knopf vw-knopf--voll', onclick: meldungFormular, disabled: !objekte.length }, 'Meldung erstellen'), h('button', { class: 'vw-knopf', onclick: beenden }, 'Abmelden'))),
    objekte.length > 1 && h('div', { class: 'vw-kunde-filter' },
      h('label', { for: 'k-objekt' }, h('strong', {}, 'Ansicht:')),
      h('select', { id: 'k-objekt', onchange: (e: Event) => { objektFilter = (e.target as HTMLSelectElement).value; zeichne(); } },
        h('option', { value: '' }, `Alle Objekte (${objekte.length})`), objekte.map((o) => h('option', { value: o.id, selected: o.id === objektFilter }, o.bezeichnung)))),
    h('div', { class: 'vw-kennzahlen' },
      dieser ? kennzahl(geld(dieser.ist), `Mieteingang ${monatName} · Soll ${geld(dieser.soll)}`, undefined, dieser.soll > dieser.ist + 0.5 ? 'vw-kennzahl--gelb' : '') : kennzahl(String(gewaehlt.length), 'Objekte'),
      einheitenSumme ? kennzahl(`${vermietetSumme} / ${einheitenSumme}`, `Einheiten vermietet (${Math.round((vermietetSumme / einheitenSumme) * 100)} %)`, undefined, vermietetSumme < einheitenSumme ? 'vw-kennzahl--gelb' : '') : kennzahl('–', 'Einheiten'),
      kennzahl(geld(offenSumme), 'offene Rechnungen', undefined, offenSumme > 0 ? 'vw-kennzahl--gelb' : ''),
      kennzahl(String(meldungen.filter((m) => m.status !== 'Erledigt' && (!objektFilter || m.objektId === objektFilter)).length), 'offene Meldungen')),
    monate.length > 0 && h('div', { class: 'vw-zwei vw-zwei--diagramme' },
      h('section', { class: 'vw-karte' }, h('header', { class: 'vw-karte__kopf' }, h('h2', {}, 'Mieteingänge – letzte 12 Monate')),
        mieteingangDiagramm(monate)),
      h('section', { class: 'vw-karte' }, h('header', { class: 'vw-karte__kopf' }, h('h2', {}, `Kosten ${jahr} nach Art`)),
        kostenListe.length ? balkenListe(kostenListe, `Kosten ${jahr} nach Kostenart`) : h('p', { class: 'vw-leer' }, `Für ${jahr} sind noch keine Kosten erfasst.`))),
    h('div', { class: 'vw-zwei' },
      h('section', { class: 'vw-karte' }, h('header', { class: 'vw-karte__kopf' }, h('h2', {}, 'Ihre Objekte')),
        objekte.length ? h('ul', { class: 'vw-objekte' }, objekte.map((o) => h('li', {}, h('div', { class: 'vw-objekte__zeile' },
          h('span', {}, h('strong', {}, o.bezeichnung), h('small', {}, [o.strasse, o.ort].filter(Boolean).join(', ')),
            h('small', {}, `${alle('einheiten').filter((e) => e.objektId === o.id).length} Einheiten · ${(o.leistungen ?? []).join(', ') || 'Leistungen: –'}`)))))) : h('p', { class: 'vw-leer' }, 'Es sind noch keine Objekte hinterlegt.')),
      h('section', { class: 'vw-karte' }, h('header', { class: 'vw-karte__kopf' }, h('h2', {}, 'Ihre Ansprechpartner')),
        team.length || firma() ? h('ul', { class: 'vw-punkte' },
          team.map((m) => h('li', {}, h('div', { class: 'vw-objekte__zeile' }, h('span', {}, h('strong', {}, m.name), h('small', {}, m.rolle ?? ''),
            m.telefon && h('small', {}, h('a', { href: `tel:${tel(m.telefon)}` }, m.telefon)), m.email && h('small', {}, h('a', { href: `mailto:${m.email}` }, m.email)))))),
          firma()?.telefon && h('li', {}, h('div', { class: 'vw-objekte__zeile' }, h('span', {}, h('strong', {}, firma()?.name ?? 'Verwaltung'), h('small', {}, h('a', { href: `tel:${tel(firma()?.telefon)}` }, firma()?.telefon)))))) : h('p', { class: 'vw-leer' }, 'Rufen Sie uns an – wir sind für Sie da.'))),
    liste('Meldungen und Schäden', meldungen.map((m) => h('li', {}, h('div', { class: 'vw-punkte__zeile' }, marke(m.kategorie ?? 'Meldung'), h('span', { class: 'vw-punkte__text' }, h('strong', {}, m.titel), h('small', { class: 'vw-block' }, `${objName(m.objektId)} · gemeldet ${datum(m.gemeldet)}`)), marke(m.status)))), 'Keine Meldungen. Über „Meldung erstellen“ erreichen Sie uns jederzeit.'),
    h('section', { class: 'vw-karte' }, h('header', { class: 'vw-karte__kopf' }, h('h2', {}, 'Rechnungen ', h('span', { class: 'vw-zahl' }, String(rechnungen.length)))),
      rechnungen.length ? h('div', { class: 'vw-tabelle' }, h('table', {}, h('thead', {}, h('tr', {}, ['Nummer', 'Datum', 'Betrag', 'Zahlbar bis', 'Stand', ''].map((t) => h('th', { scope: 'col' }, t)))),
        h('tbody', {}, rechnungen.map((r) => h('tr', {},
          h('td', { 'data-spalte': 'Nummer' }, h('strong', {}, r.nummer ?? '')), h('td', { 'data-spalte': 'Datum' }, datum(r.datum)),
          h('td', { 'data-spalte': 'Betrag', class: 'vw-zahlspalte' }, geld(rechnungSumme(r).brutto)), h('td', { 'data-spalte': 'Zahlbar bis' }, datum(r.faellig)),
          h('td', { 'data-spalte': 'Stand' }, marke(r.status, r.status === 'Offen' && r.faellig && r.faellig < heute() ? 'rot' : undefined)),
          h('td', { class: 'vw-aktion' }, h('button', { class: 'vw-knopf vw-knopf--klein', onclick: () => { rechnungId = r.id; zeichne(); wurzelEl.scrollIntoView({ block: 'start' }); } }, 'Ansehen'))))))) : h('p', { class: 'vw-leer' }, 'Noch keine Rechnungen.')),
    liste('Laufende Arbeiten und Projekte', arbeiten.map((x) => h('li', {}, h('div', { class: 'vw-punkte__zeile' }, marke(x.status ?? x.phase), h('span', { class: 'vw-punkte__text' }, h('strong', {}, x.titel), h('small', { class: 'vw-block' }, [objName(x.objektId), x.ende ? `bis ${datum(x.ende)}` : x.ziel ? `Fertigstellung ${datum(x.ziel)}` : ''].filter(Boolean).join(' · ')))))), 'Aktuell laufen keine Arbeiten.'),
    liste('Dokumente', alle('dokumente').map((x) => h('li', {}, h('div', { class: 'vw-punkte__zeile' }, marke(x.art ?? 'Dokument', 'grau'), h('span', { class: 'vw-punkte__text' }, h('strong', {}, x.titel), h('small', { class: 'vw-block' }, `${objName(x.objektId)} · ${datum(x.datum)}`))))), 'Keine Dokumente hinterlegt. Auf Anfrage senden wir Ihnen gern Unterlagen zu.'));
}

function zeichne() { wurzelEl.replaceChildren(ansicht()); druckrahmen(wurzelEl, 'Ihr Kundenbereich – Übersicht', true); }

export function starteKunde(wurzel: HTMLElement, nutzerNummer: string, abmelden: () => void) {
  wurzelEl = wurzel;
  nummer = nutzerNummer;
  beenden = abmelden;
  zeichne();
}
