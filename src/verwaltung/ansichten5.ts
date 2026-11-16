/**
 * TEAM & ZUWEISUNG
 * ---------------------------------------------------------------
 * Hier wird festgelegt, wer welches Objekt betreut. Zugewiesen wird
 * immer das ganze Objekt (mit allen Einheiten, Mietern, Aufträgen …),
 * nie einzelne Einheiten. Die Auslastung zeigt, wie viel an jeder
 * Person hängt. Bei Urlaub oder Weggang lassen sich alle Objekte
 * einer Person auf einmal übergeben.
 */
import { alle, finde, heute, speichere, type Satz } from './speicher';
import { rueckstand } from './rechnen';
import { arbeitUebergeben, offeneArbeit, setzeAnsicht, unverteiltZuweisen } from './ansicht';
import { formular, h, hinweis, kennzahl, marke, personWahl, routen, zeichne } from './app';

const gewaehlt = new Set<string>();
let zielBetreuer = '';
let uebergabeVon = '';
let uebergabeAn = '';

const aktive = () => alle('mitarbeiter').filter((m) => m.aktiv !== false);

function auslastung(id: string) {
  const objekte = alle('objekte').filter((o) => o.betreuerId === id);
  const ids = new Set(objekte.map((o) => o.id));
  const imObjekt = (art: string) => alle(art).filter((x) => ids.has(x.objektId));
  return {
    objekte: objekte.length,
    vertretung: alle('objekte').filter((o) => o.vertretungId === id).length,
    einheiten: imObjekt('einheiten').length,
    meldungen: imObjekt('vorgaenge').filter((v) => v.status !== 'Erledigt').length,
    aufgaben: alle('aufgaben').filter((a) => !a.erledigt && a.zustaendigId === id).length,
    aufgabenUeberfaellig: alle('aufgaben').filter((a) => !a.erledigt && a.zustaendigId === id && a.faellig && a.faellig < heute()).length,
    fristen: imObjekt('fristen').filter((f) => !f.erledigt && f.faellig < heute()).length,
    rueckstaende: alle('mieter').filter((m) => !m.ende && rueckstand(m) > 0 && ids.has(finde('einheiten', m.einheitId)?.objektId)).length,
  };
}

function mitarbeiterWahl(wert: string, auf: (id: string) => void, leer = '– bitte wählen –', label = 'Mitarbeiter') {
  return h('select', { 'aria-label': label, onchange: (e: Event) => auf((e.target as HTMLSelectElement).value) },
    h('option', { value: '' }, leer), aktive().map((m) => h('option', { value: m.id, selected: m.id === wert }, m.name)));
}

routen.team = () => {
  const leute = aktive();
  const objekte = alle('objekte');
  const ohne = objekte.filter((o) => !o.betreuerId);
  const zuweisen = (ids: string[], feld: 'betreuerId' | 'vertretungId', wer: string) => {
    const arbeit = { aufgaben: [] as Satz[], meldungen: [] as Satz[] };
    if (feld === 'betreuerId') ids.forEach((id) => { const alt = finde('objekte', id)?.betreuerId; if (alt && alt !== wer) { const a = offeneArbeit([id], alt); arbeit.aufgaben.push(...a.aufgaben); arbeit.meldungen.push(...a.meldungen); } });
    ids.forEach((id) => speichere('objekte', { id, [feld]: wer }));
    if (feld === 'betreuerId') ids.forEach((id) => unverteiltZuweisen(id, wer));
    const n = arbeit.aufgaben.length + arbeit.meldungen.length;
    if (n && confirm(`${n} offene Aufgaben und Meldungen dieser Objekte liegen noch beim bisherigen Betreuer. Auch an ${finde('mitarbeiter', wer)?.name} übergeben?`)) arbeitUebergeben(arbeit, wer);
    gewaehlt.clear();
    hinweis(`${ids.length} Objekt(e) zugewiesen`);
  };
  return h('div', { class: 'vw-stapel' },
    h('header', { class: 'vw-seitenkopf' }, h('h1', {}, 'Team & Zuweisung'),
      h('p', {}, 'Ein Objekt gehört einem Objektbetreuer – mit allen Einheiten, Mietern, Aufträgen und Fristen. Zugewiesen wird immer das ganze Objekt.')),
    h('div', { class: 'vw-kennzahlen' },
      kennzahl(String(leute.length), 'Mitarbeiter'), kennzahl(String(objekte.length), 'Objekte'),
      kennzahl(String(ohne.length), 'ohne Betreuer', undefined, ohne.length ? 'vw-kennzahl--gelb' : ''),
      kennzahl(String(objekte.filter((o) => o.betreuerId && !o.vertretungId).length), 'ohne Vertretung')),

    h('section', { class: 'vw-karte' },
      h('header', { class: 'vw-karte__kopf' }, h('h2', {}, 'Team ', h('span', { class: 'vw-zahl' }, String(leute.length))),
        h('button', { class: 'vw-knopf vw-knopf--voll', onclick: () => formular('mitarbeiter', {}) }, '+ Mitarbeiter')),
      h('div', { class: 'vw-tabelle' }, h('table', {},
        h('thead', {}, h('tr', {}, ['Mitarbeiter', 'Objekte', 'Einheiten', 'Aufgaben', 'Meldungen', 'Fristen', 'Rückstände', ''].map((t) => h('th', { scope: 'col' }, t)))),
        h('tbody', {}, leute.length ? leute.map((m) => { const a = auslastung(m.id); return h('tr', { tabindex: 0, onclick: () => formular('mitarbeiter', m) },
          h('td', { 'data-spalte': 'Mitarbeiter' }, h('strong', {}, m.name), h('small', { class: 'vw-block' }, [m.rolle, m.nummer].filter(Boolean).join(' · '))),
          h('td', { 'data-spalte': 'Objekte', class: 'vw-zahlspalte' }, String(a.objekte), a.vertretung > 0 && h('small', { class: 'vw-block' }, `+ ${a.vertretung} Vertretung`)),
          h('td', { 'data-spalte': 'Einheiten', class: 'vw-zahlspalte' }, String(a.einheiten)),
          h('td', { 'data-spalte': 'Aufgaben', class: 'vw-zahlspalte' }, String(a.aufgaben), a.aufgabenUeberfaellig > 0 && h('small', { class: 'vw-block' }, `${a.aufgabenUeberfaellig} überfällig`)),
          h('td', { 'data-spalte': 'Meldungen', class: 'vw-zahlspalte' }, String(a.meldungen)),
          h('td', { 'data-spalte': 'Fristen', class: 'vw-zahlspalte' }, a.fristen ? marke(String(a.fristen), 'rot') : '0'),
          h('td', { 'data-spalte': 'Rückstände', class: 'vw-zahlspalte' }, a.rueckstaende ? marke(String(a.rueckstaende), 'gelb') : '0'),
          h('td', { class: 'vw-aktion' }, h('button', { class: 'vw-knopf vw-knopf--klein', onclick: (e: Event) => { e.stopPropagation(); setzeAnsicht(m.id); location.hash = '#/'; zeichne(); } }, 'Ansicht'))); })
          : [h('tr', {}, h('td', { colspan: 8, class: 'vw-leer' }, 'Legen Sie Ihr Team an. Wer sich anmeldet, bekommt „Meine Objekte“ angezeigt, wenn bei der Person die Login-Nummer hinterlegt ist.'))])))),

    h('section', { class: 'vw-karte' },
      h('header', { class: 'vw-karte__kopf' }, h('h2', {}, 'Objekte zuweisen'), h('span', {}, 'Wählen Sie Objekte aus und weisen Sie sie gemeinsam zu.')),
      h('div', { class: 'vw-reihe vw-leiste' },
        h('span', {}, `${gewaehlt.size} ausgewählt`),
        mitarbeiterWahl(zielBetreuer, (id) => { zielBetreuer = id; }, '– zuweisen an –', 'Zuweisen an'),
        h('button', { class: 'vw-knopf vw-knopf--voll', disabled: !gewaehlt.size, onclick: () => { if (!zielBetreuer) return alert('Bitte wählen Sie zuerst den Mitarbeiter.'); zuweisen([...gewaehlt], 'betreuerId', zielBetreuer); } }, 'Als Betreuer'),
        h('button', { class: 'vw-knopf', disabled: !gewaehlt.size, onclick: () => { if (!zielBetreuer) return alert('Bitte wählen Sie zuerst den Mitarbeiter.'); zuweisen([...gewaehlt], 'vertretungId', zielBetreuer); } }, 'Als Vertretung'),
        h('button', { class: 'vw-knopf', onclick: () => { objekte.filter((o) => !o.betreuerId).forEach((o) => gewaehlt.add(o.id)); zeichne(); } }, 'Alle ohne Betreuer wählen')),
      h('div', { class: 'vw-tabelle' }, h('table', {},
        h('thead', {}, h('tr', {}, ['', 'Objekt', 'Einheiten', 'Kunde', 'Objektbetreuer', 'Vertretung'].map((t) => h('th', { scope: 'col' }, t)))),
        h('tbody', {}, objekte.length ? objekte.map((o) => h('tr', {},
          h('td', { 'data-spalte': 'Auswahl' }, h('input', { type: 'checkbox', 'aria-label': `${o.bezeichnung} auswählen`, checked: gewaehlt.has(o.id), onchange: (e: Event) => { (e.target as HTMLInputElement).checked ? gewaehlt.add(o.id) : gewaehlt.delete(o.id); zeichne(); } })),
          h('td', { 'data-spalte': 'Objekt' }, h('a', { href: `#/objekt/${o.id}` }, h('strong', {}, o.bezeichnung)), h('small', { class: 'vw-block' }, o.ort)),
          h('td', { 'data-spalte': 'Einheiten', class: 'vw-zahlspalte' }, String(alle('einheiten').filter((e) => e.objektId === o.id).length)),
          h('td', { 'data-spalte': 'Kunde' }, finde('kunden', o.kundeId)?.name ?? '–'),
          h('td', { 'data-spalte': 'Objektbetreuer' }, personWahl(o, 'betreuerId')),
          h('td', { 'data-spalte': 'Vertretung' }, personWahl(o, 'vertretungId'))))
          : [h('tr', {}, h('td', { colspan: 6, class: 'vw-leer' }, 'Es gibt noch keine Objekte.'))])))),

    h('section', { class: 'vw-karte vw-text' },
      h('h2', {}, 'Übergabe bei Urlaub oder Weggang'),
      h('p', {}, 'Überträgt alle Objekte einer Person auf eine andere: Betreuung und Vertretung. Offene Aufgaben und Meldungen gehen mit. Die Daten bleiben unverändert, nur die Zuständigkeit wechselt.'),
      h('div', { class: 'vw-reihe' },
        mitarbeiterWahl(uebergabeVon, (id) => { uebergabeVon = id; }, '– von –', 'Übergabe von'),
        h('span', {}, '→'),
        mitarbeiterWahl(uebergabeAn, (id) => { uebergabeAn = id; }, '– an –', 'Übergabe an'),
        h('button', { class: 'vw-knopf', onclick: () => {
          if (!uebergabeVon || !uebergabeAn || uebergabeVon === uebergabeAn) return alert('Bitte wählen Sie zwei verschiedene Mitarbeiter.');
          const betroffen = objekte.filter((o) => o.betreuerId === uebergabeVon || o.vertretungId === uebergabeVon);
          if (!betroffen.length) return alert('Diese Person hat keine Objekte.');
          if (!confirm(`${betroffen.length} Objekt(e) von ${finde('mitarbeiter', uebergabeVon)?.name} an ${finde('mitarbeiter', uebergabeAn)?.name} übergeben?`)) return;
          betroffen.forEach((o) => speichere('objekte', { id: o.id, ...(o.betreuerId === uebergabeVon ? { betreuerId: uebergabeAn } : {}), ...(o.vertretungId === uebergabeVon ? { vertretungId: uebergabeAn } : {}) }));
          const mit = arbeitUebergeben({ aufgaben: alle('aufgaben').filter((a) => !a.erledigt && a.zustaendigId === uebergabeVon), meldungen: alle('vorgaenge').filter((v) => v.status !== 'Erledigt' && v.zustaendigId === uebergabeVon) }, uebergabeAn);
          hinweis(`${betroffen.length} Objekt(e) und ${mit} offene Aufgaben/Meldungen übergeben`);
        } }, 'Übergeben'))));
};
