/**
 * AUFGABEN – die tägliche Arbeitsliste
 * ---------------------------------------------------------------
 * Jede Aufgabe hat einen Zuständigen (automatisch der Objektbetreuer),
 * eine Priorität, einen Bereich und optional eine Wiederholung. Die Seite
 * zeigt standardmäßig „Meine Aufgaben“, gruppiert nach Fälligkeit, und
 * führt die mir zugewiesenen Meldungen und Schäden mit auf.
 */
import { alle, finde, heute, speichere, type Satz } from './speicher';
import { ARTEN } from './schema';
import { datumPlus, tageBis } from './rechnen';
import { ds, ich, standardZustaendig } from './ansicht';
import { aufgabeAbhaken, datum, formular, h, kennzahl, marke, routen, zeichne } from './app';

let wer = ''; // '' = automatisch (ich, sonst alle) | 'alle' | 'offen' | Mitarbeiter-ID
let bereichFilter = '';
let prioFilter = '';
let objektFilter = '';
let mitErledigten = false;

const PRIO: Record<string, string> = { Dringend: 'rot', Hoch: 'gelb', Normal: 'grau', Niedrig: 'grau' };
const prioWert = (p?: string) => ['Dringend', 'Hoch', 'Normal', 'Niedrig'].indexOf(p ?? 'Normal');
const effektiv = () => wer || (ich() ? ich()!.id : 'alle');

function filtern(a: Satz): boolean {
  const w = effektiv();
  if (w === 'offen' ? !!a.zustaendigId : w !== 'alle' && a.zustaendigId !== w) return false;
  if (bereichFilter && a.bereich !== bereichFilter) return false;
  if (prioFilter && (a.prioritaet ?? 'Normal') !== prioFilter) return false;
  if (objektFilter && a.objektId !== objektFilter) return false;
  return true;
}

function auswahl(label: string, wert: string, optionen: [string, string][], auf: (v: string) => void) {
  return h('label', { class: 'vw-filter' }, h('span', {}, label),
    h('select', { onchange: (e: Event) => { auf((e.target as HTMLSelectElement).value); zeichne(); } },
      optionen.map(([v, t]) => h('option', { value: v, selected: v === wert }, t))));
}

function zeile(a: Satz): HTMLElement {
  const objekt = finde('objekte', a.objektId);
  const tage = a.faellig ? tageBis(a.faellig) : null;
  const leute = alle('mitarbeiter').filter((m) => m.aktiv !== false || m.id === a.zustaendigId);
  const fallig = a.erledigt ? (a.erledigtAm ? `erledigt ${datum(a.erledigtAm)}` : 'erledigt')
    : a.faellig ? `${datum(a.faellig)}${tage !== null && tage < 0 ? ` · ${-tage} T. überfällig` : tage === 0 ? ' · heute' : ''}` : 'ohne Termin';
  return h('li', { class: `vw-aufgabe ${a.erledigt ? 'vw-aufgabe--erledigt' : ''}` },
    h('input', { type: 'checkbox', checked: !!a.erledigt, 'aria-label': `„${a.titel}“ erledigt`, onchange: () => aufgabeAbhaken(a) }),
    h('button', { type: 'button', class: 'vw-aufgabe__text', onclick: () => formular('aufgaben', a) },
      h('strong', {}, a.titel),
      h('small', {}, [objekt?.bezeichnung, a.bereich, a.wiederholung && a.wiederholung !== 'Keine' ? `↻ ${a.wiederholung}` : ''].filter(Boolean).join(' · ') || 'ohne Objekt')),
    h('span', { class: 'vw-aufgabe__meta' },
      (a.prioritaet === 'Dringend' || a.prioritaet === 'Hoch') && marke(a.prioritaet, PRIO[a.prioritaet]),
      h('span', { class: tage !== null && tage < 0 && !a.erledigt ? 'vw-faellig vw-faellig--rot' : '' }, fallig),
      h('select', { 'aria-label': 'Zuständig', onchange: (e: Event) => speichere('aufgaben', { id: a.id, zustaendigId: (e.target as HTMLSelectElement).value }) },
        h('option', { value: '' }, '– niemand –'), leute.map((m) => h('option', { value: m.id, selected: m.id === a.zustaendigId }, m.name)))));
}

routen.aufgaben = () => {
  const mich = ich();
  const alleA = ds('aufgaben').filter(filtern);
  const offen = alleA.filter((a) => !a.erledigt);
  const h0 = heute();
  const sortiert = (l: Satz[]) => [...l].sort((a, b) => prioWert(a.prioritaet) - prioWert(b.prioritaet) || String(a.faellig ?? '9999').localeCompare(String(b.faellig ?? '9999')));
  const ueberfaellig = offen.filter((a) => a.faellig && a.faellig < h0);
  const heut = offen.filter((a) => a.faellig === h0);
  const woche = offen.filter((a) => a.faellig && a.faellig > h0 && a.faellig <= datumPlus(h0, 7));
  const spaeter = offen.filter((a) => a.faellig && a.faellig > datumPlus(h0, 7));
  const ohne = offen.filter((a) => !a.faellig);
  const erledigt = alleA.filter((a) => a.erledigt && (!a.erledigtAm || a.erledigtAm >= datumPlus(h0, -30))).sort((a, b) => String(b.erledigtAm ?? '').localeCompare(String(a.erledigtAm ?? '')));
  const gruppe = (titel: string, l: Satz[], ton = '') => l.length > 0 && h('section', { class: 'vw-karte' },
    h('header', { class: 'vw-karte__kopf' }, h('h2', { class: ton }, titel, ' ', h('span', { class: 'vw-zahl' }, String(l.length)))),
    h('ul', { class: 'vw-aufgaben' }, sortiert(l).map(zeile)));

  // Meldungen und Schäden, die der gewählten Person zugewiesen sind
  const w = effektiv();
  const meldungen = ds('vorgaenge').filter((v) => v.status !== 'Erledigt' && (w === 'alle' || (w === 'offen' ? !v.zustaendigId : v.zustaendigId === w)));

  const schnell = h('input', { id: 'vw-schnell', type: 'text', placeholder: 'Neue Aufgabe eingeben und Enter drücken …', 'aria-label': 'Neue Aufgabe', onkeydown: (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const t = (e.target as HTMLInputElement).value.trim();
    if (!t) return;
    speichere('aufgaben', { titel: t, zustaendigId: w !== 'alle' && w !== 'offen' ? w : standardZustaendig(objektFilter), objektId: objektFilter, prioritaet: 'Normal', faellig: h0 });
    setTimeout(() => document.getElementById('vw-schnell')?.focus());
  } });

  return h('div', { class: 'vw-stapel' },
    h('header', { class: 'vw-seitenkopf' }, h('h1', {}, w === 'alle' ? 'Aufgaben' : w === 'offen' ? 'Aufgaben ohne Zuständigen' : w === mich?.id ? 'Meine Aufgaben' : `Aufgaben von ${finde('mitarbeiter', w)?.name ?? '?'}`),
      h('p', {}, 'Aufgaben gehören einer Person. Neue Aufgaben gehören der Person, deren Liste Sie gerade sehen; bei „Allen“ übernimmt der Objektbetreuer.')),
    h('div', { class: 'vw-kennzahlen' },
      kennzahl(String(offen.length), 'offen'),
      kennzahl(String(ueberfaellig.length), 'überfällig', undefined, ueberfaellig.length ? 'vw-kennzahl--rot' : ''),
      kennzahl(String(heut.length), 'heute fällig', undefined, heut.length ? 'vw-kennzahl--blau' : ''),
      kennzahl(String(meldungen.length), 'offene Meldungen', '#/liste/vorgaenge', meldungen.length ? 'vw-kennzahl--gelb' : '')),
    h('div', { class: 'vw-schnellerfassung' }, schnell, h('button', { class: 'vw-knopf vw-knopf--voll', onclick: () => formular('aufgaben', { zustaendigId: w !== 'alle' && w !== 'offen' ? w : '', objektId: objektFilter, faellig: h0 }) }, '+ Aufgabe mit Details')),
    h('div', { class: 'vw-filterleiste' },
      auswahl('Zuständig', w, [...(mich ? [[mich.id, 'Mir'] as [string, string]] : []), ['alle', 'Allen'], ...alle('mitarbeiter').filter((m) => m.aktiv !== false && m.id !== mich?.id).map((m) => [m.id, m.name] as [string, string]), ['offen', 'Niemandem']], (v) => (wer = v)),
      auswahl('Objekt', objektFilter, [['', 'Alle'], ...ds('objekte').map((o) => [o.id, o.bezeichnung] as [string, string])], (v) => (objektFilter = v)),
      auswahl('Bereich', bereichFilter, [['', 'Alle'], ...ARTEN.aufgaben.felder.find((f) => f.name === 'bereich')!.optionen!.map((b) => [b, b] as [string, string])], (v) => (bereichFilter = v)),
      auswahl('Priorität', prioFilter, [['', 'Alle'], ['Dringend', 'Dringend'], ['Hoch', 'Hoch'], ['Normal', 'Normal'], ['Niedrig', 'Niedrig']], (v) => (prioFilter = v)),
      h('label', { class: 'vw-haken' }, h('input', { type: 'checkbox', checked: mitErledigten, onchange: (e: Event) => { mitErledigten = (e.target as HTMLInputElement).checked; zeichne(); } }), ' Erledigte zeigen')),
    offen.length === 0 && h('p', { class: 'vw-leer vw-karte' }, 'Keine offenen Aufgaben in dieser Auswahl. Gut gemacht – oder legen Sie oben eine neue an.'),
    gruppe('Überfällig', ueberfaellig, 'vw-rot'), gruppe('Heute', heut), gruppe('Diese Woche', woche), gruppe('Später', spaeter), gruppe('Ohne Termin', ohne),
    meldungen.length > 0 && h('section', { class: 'vw-karte' },
      h('header', { class: 'vw-karte__kopf' }, h('h2', {}, 'Meldungen und Schäden ', h('span', { class: 'vw-zahl' }, String(meldungen.length))), h('a', { class: 'vw-knopf vw-knopf--klein', href: '#/liste/vorgaenge' }, 'Alle Meldungen')),
      h('ul', { class: 'vw-aufgaben' }, meldungen.map((v) => h('li', { class: 'vw-aufgabe' },
        h('span', { class: 'vw-aufgabe__pkt' }, marke(v.kategorie ?? 'Meldung')),
        h('button', { type: 'button', class: 'vw-aufgabe__text', onclick: () => formular('vorgaenge', v) }, h('strong', {}, v.titel), h('small', {}, [finde('objekte', v.objektId)?.bezeichnung, `gemeldet ${datum(v.gemeldet)}`].filter(Boolean).join(' · '))),
        h('span', { class: 'vw-aufgabe__meta' }, marke(v.status), v.zustaendigId && h('small', {}, finde('mitarbeiter', v.zustaendigId)?.name ?? '')))))),
    mitErledigten && erledigt.length > 0 && gruppe('Erledigt (30 Tage)', erledigt));
};
