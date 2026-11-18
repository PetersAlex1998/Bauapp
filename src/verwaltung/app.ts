/**
 * OBERFLÄCHE des Verwaltertools
 * ---------------------------------------------------------------
 * Aufbau: Navigation links, Inhalt rechts. Jede Ansicht ist eine
 * Funktion, die fertige Elemente zurückgibt. Listen und Formulare
 * entstehen aus dem Datenmodell (schema.ts).
 */
import { hatZweiFaktor, istAdmin, modus } from './cloud';
import { alle, beiAenderung, beiSicherung, ersetze, exportiere, finde, heute, importiere, istLeer, loesche, speichere, type Satz } from './speicher';
import { ARTEN, KREISE, abhaengige, verweise, type Art, type Feld } from './schema';
import { ansichtBeschreibung, ansichtId, ansichtWahl, arbeitUebergeben, ds, ich, objektIdVon, offeneArbeit, setzeAnsicht, sichtbar, sichtbareObjektIds, standardZustaendig, unverteiltZuweisen } from './ansicht';
import {
  aktivIm, datumPlus, datumPlusMonate, einheitenVon, gezahlt, sollIm, mahnstufe, mieterVon, monatHeute, monatPlus, naechsterTermin,
  nebenkosten, objektVonMieter, rechnungSumme, rechnungUeberfaellig, rueckstand, soll, status360, tageBis, zahl, type Zustand,
} from './rechnen';
import { beispieldaten } from './beispiel';

/* ================= Hilfen ================= */
type Kind = Node | string | number | null | undefined | false | Kind[];
export function h(tag: string, attrs: Record<string, any> = {}, ...kinder: Kind[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  const anhaengen = (k: Kind) => {
    if (Array.isArray(k)) k.forEach(anhaengen);
    else if (k != null && k !== false) el.append(k instanceof Node ? k : String(k));
  };
  kinder.forEach(anhaengen);
  return el;
}
/** Erweiterungen (ansichten2.ts) hängen hier ihre Seiten und Aktionen ein. */
export const routen: Record<string, (a?: string, b?: string) => HTMLElement> = {};
export const aktionen: Record<string, (s: Satz) => void> = {};

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
export const geld = (x: any) => euro.format(zahl(x));
export const datum = (d?: string) => (d ? d.split('-').reverse().join('.') : '–');
export const monatText = (m: string) => new Date(m + '-01T00:00:00Z').toLocaleDateString('de-DE', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export function hinweis(text: string) {
  document.querySelectorAll('.vw-toast').forEach((alt) => alt.remove()); // immer nur ein Hinweis
  const el = h('div', { class: 'vw-toast', role: 'status' }, text);
  document.body.append(el);
  setTimeout(() => el.remove(), 3200);
}

/** Anzeigetext eines Feldwerts */
function wert(feld: Feld, s: Satz): string {
  const v = s[feld.name];
  if (feld.typ === 'ja') return v ? 'Ja' : '–';
  if (v == null || v === '') return '–';
  switch (feld.typ) {
    case 'ref': { const ziel = finde(feld.auf!, v); return ziel ? ARTEN[feld.auf!].anzeige(ziel) : '–'; }
    case 'geld': return geld(v);
    case 'datum': return datum(v);
    case 'monat': return monatText(v);
    case 'mehr': return (v as string[]).join(', ') || '–';
    default: return String(v);
  }
}
const feldVon = (art: Art, name: string) => art.felder.find((x) => x.name === name)!;

/** Farbmarke für Status-artige Werte */
const MARKEN: Record<string, string> = {
  Offen: 'rot', Notfall: 'rot', Abgelehnt: 'rot', Angefochten: 'rot',
  'In Arbeit': 'blau', Beauftragt: 'blau', Bauphase: 'blau', Vergabe: 'blau', 'Angebot erstellt': 'blau', Planung: 'blau', Analyse: 'blau', 'Beschluss / Freigabe': 'blau',
  'Wartet auf Dritte': 'gelb', Abnahme: 'gelb', Anfrage: 'gelb', Idee: 'gelb', Störung: 'gelb',
  Erledigt: 'gruen', Abgeschlossen: 'gruen', Angenommen: 'gruen', Bezahlt: 'gruen', Zugestimmt: 'gruen', Versandt: 'blau', Dringend: 'rot', Hoch: 'gelb',
};
export const marke = (text: string, farbe?: string) => h('span', { class: `vw-marke vw-marke--${farbe ?? MARKEN[text] ?? 'grau'}` }, text);

/* ================= Formular (Dialog) ================= */
function neueKundennummer(): string {
  const vergeben = new Set(alle('kunden').map((k) => k.kundennummer));
  for (;;) {
    const nr = String(Math.floor(100000000 + Math.random() * 900000000));
    if (!vergeben.has(nr)) return nr;
  }
}

export function formular(artName: string, satz: Partial<Satz> = {}, nachher?: (s: Satz) => void) {
  const art = ARTEN[artName];
  const neu = !satz.id;
  const dialog = h('dialog', { class: 'vw-dialog', 'aria-labelledby': 'vw-dialog-titel' }) as HTMLDialogElement;
  const felder = art.felder.map((feld) => {
    const id = `f-${feld.name}`;
    const aktuell = satz[feld.name] ?? (neu ? feld.vorgabe : undefined);
    let eingabe: HTMLElement;
    if (feld.typ === 'lang') eingabe = h('textarea', { id, name: feld.name, rows: 4 }, aktuell ?? '');
    else if (feld.typ === 'wahl') eingabe = h('select', { id, name: feld.name, required: feld.pflicht },
      h('option', { value: '' }, 'Bitte wählen'), feld.optionen!.map((o) => h('option', { value: o, selected: o === aktuell }, o)));
    else if (feld.typ === 'ref') eingabe = h('select', { id, name: feld.name, required: feld.pflicht },
      h('option', { value: '' }, alle(feld.auf!).length ? 'Bitte wählen' : `Noch keine ${ARTEN[feld.auf!].titel} angelegt`),
      alle(feld.auf!).map((z) => h('option', { value: z.id, selected: z.id === aktuell }, ARTEN[feld.auf!].anzeige(z))));
    else if (feld.typ === 'ja') eingabe = h('label', { class: 'vw-haken' }, h('input', { type: 'checkbox', id, name: feld.name, checked: !!aktuell }), ' ', feld.label);
    else if (feld.typ === 'mehr') eingabe = h('div', { class: 'vw-mehr' }, feld.optionen!.map((o) =>
      h('label', { class: 'vw-haken' }, h('input', { type: 'checkbox', name: feld.name, value: o, checked: (aktuell ?? []).includes(o) }), ' ', o)));
    else eingabe = h('input', {
      id, name: feld.name, required: feld.pflicht, value: aktuell ?? '',
      type: feld.typ === 'datum' ? 'date' : feld.typ === 'monat' ? 'month' : feld.typ === 'zahl' || feld.typ === 'geld' ? 'number' : 'text',
      step: feld.typ === 'geld' ? '0.01' : feld.typ === 'zahl' ? 'any' : undefined,
      inputmode: feld.typ === 'geld' || feld.typ === 'zahl' ? 'decimal' : undefined,
    });
    const gesperrt = !!feld.nurAdmin && modus() === 'server' && !istAdmin();
    if (gesperrt) eingabe.setAttribute('disabled', '');
    return h('div', { class: `feld ${feld.typ === 'lang' || feld.typ === 'mehr' ? 'feld--breit' : ''}` },
      feld.typ !== 'ja' && h('label', { for: id }, feld.label, feld.pflicht && ' *'),
      eingabe, gesperrt ? h('small', {}, 'Ändern kann nur ein Admin-Zugang (Administration → Objekt-Zuweisung).') : feld.hilfe && h('small', {}, feld.hilfe));
  });

  const form = h('form', { method: 'dialog', class: 'vw-form', novalidate: false },
    h('header', { class: 'vw-dialog__kopf' },
      h('h2', { id: 'vw-dialog-titel' }, neu ? `${art.einzahl} anlegen` : `${art.einzahl} bearbeiten`),
      h('button', { type: 'button', class: 'vw-x', 'aria-label': 'Schließen', onclick: () => dialog.close() }, '×')),
    h('div', { class: 'vw-form__felder' }, felder),
    h('footer', { class: 'vw-dialog__fuss' },
      !neu && h('button', { type: 'button', class: 'vw-knopf vw-knopf--gefahr', onclick: () => { if (entferne(artName, satz.id!)) dialog.close(); } }, 'Löschen'),
      h('span', { class: 'vw-platz' }),
      h('button', { type: 'button', class: 'vw-knopf', onclick: () => dialog.close() }, 'Abbrechen'),
      h('button', { type: 'submit', class: 'vw-knopf vw-knopf--voll' }, 'Speichern'))) as HTMLFormElement;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const daten = new FormData(form);
    const neuSatz: Partial<Satz> = { id: satz.id };
    for (const feld of art.felder) {
      if (feld.nurAdmin && modus() === 'server' && !istAdmin()) continue; // gesperrte Felder nicht mitsenden
      if (feld.typ === 'ja') neuSatz[feld.name] = daten.get(feld.name) === 'on';
      else if (feld.typ === 'mehr') neuSatz[feld.name] = daten.getAll(feld.name);
      else if (feld.typ === 'zahl' || feld.typ === 'geld') { const v = String(daten.get(feld.name) ?? '').replace(',', '.'); neuSatz[feld.name] = v === '' ? '' : Number(v); }
      else neuSatz[feld.name] = String(daten.get(feld.name) ?? '').trim();
    }
    if (artName === 'kunden' && !neuSatz.kundennummer) neuSatz.kundennummer = neueKundennummer();
    if ((artName === 'aufgaben' || artName === 'vorgaenge') && !neuSatz.zustaendigId) neuSatz.zustaendigId = standardZustaendig(neuSatz.objektId);
    const fertig = speichere(artName, neuSatz);
    dialog.close();
    hinweis(`${art.einzahl} gespeichert`);
    nachher?.(fertig);
  });
  dialog.append(form);
  dialog.addEventListener('close', () => { dialog.remove(); zeichne(); });
  document.body.append(dialog);
  dialog.showModal();
}

function entferne(artName: string, id: string): boolean {
  const art = ARTEN[artName];
  const kinder = abhaengige(artName, id);
  const anzahl = kinder.reduce((sum, k) => sum + k.ids.length, 0);
  const geloescht = new Set([`${artName}:${id}`, ...kinder.flatMap((k) => k.ids.map((i) => `${k.tabelle}:${i}`))]);
  const gelost = [artName, ...kinder.map((k) => k.tabelle)].flatMap((t) => (t === artName ? verweise(t, id, geloescht) : []))
    .concat(kinder.flatMap((k) => k.ids.flatMap((i) => verweise(k.tabelle, i, geloescht))));
  let frage = `${art.einzahl} wirklich löschen?`;
  if (anzahl) frage += `\n\nDamit werden auch ${anzahl} verknüpfte Einträge gelöscht (${[...new Set(kinder.map((k) => ARTEN[k.tabelle].titel))].join(', ')}).`;
  if (gelost.length) frage += `\n\n${gelost.length} weitere Einträge (${[...new Set(gelost.map((v) => ARTEN[v.tabelle].titel))].join(', ')}) bleiben erhalten und verlieren nur den Verweis auf ${art.einzahl}.`;
  if (!confirm(frage)) return false;
  gelost.forEach((v) => speichere(v.tabelle, { id: v.satzId, ...Object.fromEntries(v.felder.map((f) => [f, ''])) }));
  kinder.forEach((k) => loesche(k.tabelle, k.ids));
  loesche(artName, [id]);
  hinweis(`${art.einzahl} gelöscht`);
  if (artName === 'objekte' && location.hash.includes(id)) location.hash = '#/liste/objekte';
  return true;
}

/* ================= Listen ================= */
const suchtext: Record<string, string> = {};

/** Schnellaktionen in der Zeile */
function zeilenAktion(artName: string, s: Satz): Node | null {
  if (artName === 'fristen' && !s.erledigt) return h('button', { class: 'vw-knopf vw-knopf--klein', onclick: (e: Event) => { e.stopPropagation(); fristErledigt(s); } }, 'Erledigt');
  if (artName === 'service') return h('button', { class: 'vw-knopf vw-knopf--klein', onclick: (e: Event) => { e.stopPropagation(); dienstErledigt(s); } }, 'Erledigt');
  if (artName === 'mieter' && !s.ende) return h('button', { class: 'vw-knopf vw-knopf--klein', onclick: (e: Event) => { e.stopPropagation(); aktionen.mieterwechsel?.(s); } }, 'Auszug …');
  if (artName === 'mieterhoehungen') return h('a', { class: 'vw-knopf vw-knopf--klein', href: `#/erhoehung/${s.id}`, onclick: (e: Event) => e.stopPropagation() }, 'Ansehen');
  if (artName === 'rechnungen') return h('a', { class: 'vw-knopf vw-knopf--klein', href: `#/rechnung/${s.id}`, onclick: (e: Event) => e.stopPropagation() }, 'Ansehen');
  if (artName === 'auftraege') return h('a', { class: 'vw-knopf vw-knopf--klein', href: `#/angebot/${s.id}`, onclick: (e: Event) => e.stopPropagation() }, 'Angebot');
  if (artName === 'aufgaben' && !s.erledigt) return h('button', { class: 'vw-knopf vw-knopf--klein', onclick: (e: Event) => { e.stopPropagation(); aufgabeAbhaken(s); } }, 'Erledigt');
  return null;
}
/** Aufgabe abhaken – wiederkehrende Aufgaben springen zum nächsten Termin. */
export function aufgabeAbhaken(a: Satz) {
  if (a.erledigt) { speichere('aufgaben', { id: a.id, erledigt: false, erledigtAm: '' }); return; }
  const w = a.wiederholung && a.wiederholung !== 'Keine' ? a.wiederholung : '';
  if (w && a.faellig) {
    const naechste = naechsterTermin(a.faellig, w);
    speichere('aufgaben', { id: a.id, faellig: naechste, erledigtAm: heute() });
    hinweis(`Erledigt – nächster Termin ${datum(naechste)}`);
  } else {
    speichere('aufgaben', { id: a.id, erledigt: true, erledigtAm: heute() });
    hinweis('Aufgabe erledigt');
  }
}
function fristErledigt(s: Satz) {
  const n = zahl(s.intervall);
  if (n > 0) { speichere('fristen', { id: s.id, faellig: datumPlusMonate(s.faellig < heute() ? heute() : s.faellig, n), zuletzt: heute() }); hinweis(`Erledigt – nächster Termin in ${n} Monaten`); }
  else { speichere('fristen', { id: s.id, erledigt: true, zuletzt: heute() }); hinweis('Frist erledigt'); }
}
function dienstErledigt(s: Satz) {
  const jetzt = new Date();
  speichere('einsaetze', { objektId: s.objektId, leistung: s.leistung, datum: heute(), uhrzeit: jetzt.toTimeString().slice(0, 5), wer: s.wer ?? '' });
  if (s.rhythmus !== 'Nach Bedarf') speichere('service', { id: s.id, naechster: naechsterTermin(s.naechster, s.rhythmus) });
  hinweis('Einsatz dokumentiert');
}

/** Zelleninhalt mit Marken und Fälligkeits-Hervorhebung */
function zelle(artName: string, art: Art, name: string, s: Satz): Node | string {
  const feld = feldVon(art, name);
  const text = wert(feld, s);
  if (['status', 'phase', 'ergebnis', 'kategorie', 'prioritaet'].includes(name) && text !== '–') return marke(text);
  const terminFeld = { fristen: 'faellig', service: 'naechster', aufgaben: 'faellig', vertraege: 'kuendigenBis', auftraege: 'ende', projekte: 'ziel', rechnungen: 'faellig' }[artName];
  if (name === terminFeld && s[name] && !s.erledigt && !['Abgeschlossen', 'Bezahlt', 'Storniert', 'Entwurf'].includes(s.status ?? s.phase)) {
    const tage = tageBis(s[name]);
    const bedarf = artName === 'service' && s.rhythmus === 'Nach Bedarf';
    if (!bedarf && tage < 0) return h('span', { class: 'vw-faellig vw-faellig--rot' }, text, h('small', {}, ` ${-tage} T. überfällig`));
    if (!bedarf && tage <= (artName === 'vertraege' ? 60 : 7)) return h('span', { class: 'vw-faellig vw-faellig--gelb' }, text, h('small', {}, tage === 0 ? ' heute' : ` in ${tage} T.`));
  }
  if (name === 'objektId' && s.objektId) return h('a', { href: `#/objekt/${s.objektId}`, onclick: (e: Event) => e.stopPropagation() }, text);
  return text;
}

export function liste(artName: string, opt: { filter?: (s: Satz) => boolean; vorgaben?: Partial<Satz>; ohneSpalte?: string; titel?: string; kompakt?: boolean } = {}): HTMLElement {
  const art = ARTEN[artName];
  const spalten = art.spalten.filter((x) => x !== opt.ohneSpalte);
  const koerper = h('tbody');
  const zaehler = h('span', { class: 'vw-zahl' });
  const fuelle = () => {
    const q = (suchtext[artName] ?? '').toLowerCase();
    let saetze = alle(artName).filter((s) => (opt.filter ? opt.filter(s) : sichtbar(artName, s)));
    const gesamt = saetze.length;
    if (q) saetze = saetze.filter((s) => art.felder.some((x) => wert(x, s).toLowerCase().includes(q)));
    const sortFeld = art.felder.find((x) => x.typ === 'datum' && spalten.includes(x.name))?.name;
    if (sortFeld) saetze = [...saetze].sort((a, b) => String(a[sortFeld] ?? '').localeCompare(String(b[sortFeld] ?? '')) * (['fristen', 'service', 'aufgaben', 'vertraege'].includes(artName) ? 1 : -1));
    zaehler.textContent = q ? `${saetze.length} von ${gesamt}` : String(gesamt);
    koerper.replaceChildren(...(saetze.length
      ? saetze.map((s) => h('tr', { tabindex: 0, class: s.erledigt ? 'vw-erledigt' : '', onclick: () => (artName === 'objekte' ? (location.hash = `#/objekt/${s.id}`) : formular(artName, s)),
          onkeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') (e.currentTarget as HTMLElement).click(); } },
          spalten.map((name) => h('td', { 'data-spalte': feldVon(art, name).label }, zelle(artName, art, name, s))),
          h('td', { class: 'vw-aktion' }, zeilenAktion(artName, s))))
      : [h('tr', {}, h('td', { colspan: spalten.length + 1, class: 'vw-leer' }, gesamt ? 'Keine Treffer für diese Suche.' : art.leer))]));
  };
  fuelle();
  return h('section', { class: `vw-karte ${opt.kompakt ? 'vw-karte--kompakt' : ''}` },
    h('header', { class: 'vw-karte__kopf' },
      h(opt.kompakt ? 'h3' : 'h2', {}, opt.titel ?? art.titel, ' ', zaehler),
      !opt.kompakt && h('input', { type: 'search', class: 'vw-suche', placeholder: 'In dieser Liste suchen …', 'aria-label': `${art.titel} durchsuchen`, value: suchtext[artName] ?? '',
        oninput: (e: Event) => { suchtext[artName] = (e.target as HTMLInputElement).value; fuelle(); } }),
      h('button', { class: 'vw-knopf vw-knopf--voll', onclick: () => formular(artName, { ...opt.vorgaben }) }, `+ ${art.einzahl}`)),
    h('div', { class: 'vw-tabelle' }, h('table', {},
      h('thead', {}, h('tr', {}, spalten.map((name) => h('th', { scope: 'col' }, feldVon(art, name).label)), h('th', {}, h('span', { class: 'sr-only' }, 'Aktion')))),
      koerper)));
}

/* ================= 360°-Ring ================= */
const FARBE: Record<Zustand, string> = { gut: '#2f8f5b', achtung: '#d99a1c', kritisch: '#c8402d', aus: '#d9dfe6' };
function ring(objektId: string, gross = false): HTMLElement {
  const st = status360(objektId);
  const namen = Object.keys(st) as (keyof typeof st)[];
  const U = 2 * Math.PI * 40;
  const bogen = namen.map((n, i) =>
    `<circle cx="50" cy="50" r="40" fill="none" stroke="${FARBE[st[n].zustand]}" stroke-width="12" stroke-dasharray="${U / 4 - 3} ${U}" stroke-dashoffset="${-(i * U) / 4 - 1.5}" />`).join('');
  const el = h('div', { class: `vw-ring ${gross ? 'vw-ring--gross' : ''}`, role: 'img', 'aria-label': '360°-Status: ' + namen.map((n) => `${n}: ${st[n].text}`).join('; ') });
  el.innerHTML = `<svg viewBox="0 0 100 100" style="transform:rotate(-90deg)">${bogen}</svg>`;
  return el;
}
function ringLegende(objektId: string): HTMLElement {
  const st = status360(objektId);
  return h('ul', { class: 'vw-legende' }, (Object.keys(st) as (keyof typeof st)[]).map((n) =>
    h('li', {}, h('span', { class: 'vw-punkt', style: `background:${FARBE[st[n].zustand]}` }), h('strong', {}, n), ' ', h('span', {}, st[n].text))));
}

/* ================= Ansichten ================= */
export function kennzahl(wertText: string, text: string, ziel?: string, ton = '') {
  return h(ziel ? 'a' : 'div', { class: `vw-kennzahl ${ton}`, href: ziel }, h('span', { class: 'vw-kennzahl__wert' }, wertText), h('span', {}, text));
}

function cockpit(): HTMLElement {
  if (istLeer()) {
    return h('section', { class: 'vw-willkommen' },
      h('h1', {}, 'Willkommen im Verwaltertool.'),
      h('p', {}, 'Hier laufen alle vier Bereiche zusammen: Verwalten, Betreuen, Erneuern und Entwickeln. Beginnen Sie mit Ihrem ersten Objekt – oder schauen Sie sich das Tool zuerst mit Beispieldaten an.'),
      h('div', { class: 'vw-reihe' },
        h('button', { class: 'vw-knopf vw-knopf--voll', onclick: () => formular('objekte', {}, (s) => (location.hash = `#/objekt/${s.id}`)) }, '+ Erstes Objekt anlegen'),
        h('button', { class: 'vw-knopf', onclick: () => { ersetze(beispieldaten()); hinweis('Beispieldaten geladen'); } }, 'Beispieldaten laden')));
  }
  const m = monatHeute();
  const objekte = ds('objekte');
  const mieter = ds('mieter').filter((x) => aktivIm(x, m));
  const einheiten = ds('einheiten').filter((e) => e.art === 'Wohnung' || e.art === 'Gewerbe');
  const leer = einheiten.filter((e) => !mieter.some((x) => x.einheitId === e.id)).length;
  const offen = ds('mieter').reduce((sum, x) => sum + rueckstand(x), 0);
  const h0 = heute();
  const dienste = ds('service').filter((x) => x.rhythmus !== 'Nach Bedarf' && x.naechster <= h0);
  const meldungen = ds('vorgaenge').filter((x) => x.status !== 'Erledigt');
  const anfragenNeu = alle('anfragen').filter((x) => x.status === 'Neu' && x.art !== 'Schadensmeldung');
  const schaedenNeu = alle('anfragen').filter((x) => x.status === 'Neu' && x.art === 'Schadensmeldung');
  const wichtig = wichtigFuer();
  const meine = ds('aufgaben').filter((a) => !a.erledigt && (!ich() || a.zustaendigId === ich()!.id));

  return h('div', { class: 'vw-stapel' },
    h('header', { class: 'vw-seitenkopf' }, h('h1', {}, 'Cockpit'), h('p', {}, new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), ' · ', ansichtBeschreibung())),
    modus() === 'server' && !hatZweiFaktor() && h('p', { class: 'vw-warnung' }, h('strong', {}, 'Sicherheit: '), 'Ihr Zugang ist nur mit Passwort geschützt. ', h('a', { href: '#/konten' }, 'Zwei-Faktor-Anmeldung jetzt einrichten'), ' (2 Minuten, mit einer App auf dem Handy).'),
    h('div', { class: 'vw-kennzahlen' },
      kennzahl(String(objekte.length), 'Objekte', '#/liste/objekte'),
      kennzahl(`${einheiten.length - leer}/${einheiten.length}`, leer ? `vermietet · ${leer} leer` : 'Einheiten vermietet', '#/mieten'),
      kennzahl(geld(mieter.reduce((sum, x) => sum + soll(x), 0)), 'Sollmiete im Monat', '#/mieten'),
      kennzahl(geld(offen), 'offene Mieten', '#/mieten', offen > 0 ? 'vw-kennzahl--rot' : ''),
      schaedenNeu.length > 0 && kennzahl(String(schaedenNeu.length), schaedenNeu.length === 1 ? 'neue Schadensmeldung (Website)' : 'neue Schadensmeldungen (Website)', '#/liste/anfragen', schaedenNeu.some((x) => x.dringlichkeit === 'Dringend') ? 'vw-kennzahl--rot' : 'vw-kennzahl--gelb'),
      anfragenNeu.length > 0 && kennzahl(String(anfragenNeu.length), anfragenNeu.length === 1 ? 'neue Website-Anfrage' : 'neue Website-Anfragen', '#/liste/anfragen', 'vw-kennzahl--blau'),
      kennzahl(String(meldungen.length), 'offene Meldungen', '#/liste/vorgaenge', meldungen.length ? 'vw-kennzahl--gelb' : ''),
      kennzahl(String(meine.length), ich() ? 'meine offenen Aufgaben' : 'offene Aufgaben', '#/aufgaben', meine.some((a) => a.faellig && a.faellig < h0) ? 'vw-kennzahl--rot' : meine.length ? 'vw-kennzahl--blau' : ''),
      kennzahl(String(dienste.length), 'Dienste heute fällig', '#/tagesplan', dienste.length ? 'vw-kennzahl--blau' : ''),
      kennzahl(geld(ds('rechnungen').filter((r) => r.status === 'Offen').reduce((sum, r) => sum + rechnungSumme(r).brutto, 0)), 'offene Rechnungen an Kunden', '#/rechnungen')),
    h('div', { class: 'vw-zwei' },
      h('section', { class: 'vw-karte' },
        h('header', { class: 'vw-karte__kopf' }, h('h2', {}, 'Jetzt wichtig ', h('span', { class: 'vw-zahl' }, String(wichtig.length)))),
        wichtigListe(wichtig, 12)),
      h('section', { class: 'vw-karte' },
        h('header', { class: 'vw-karte__kopf' }, h('h2', {}, 'Objekte im 360°-Blick'), h('a', { class: 'vw-knopf vw-knopf--klein', href: '#/team' }, 'Team & Zuweisung')),
        objekte.length
          ? h('ul', { class: 'vw-objekte' }, objekte.map((o) => h('li', {}, h('a', { href: `#/objekt/${o.id}` }, ring(o.id),
              h('span', {}, h('strong', {}, o.bezeichnung), h('small', {}, `${finde('mitarbeiter', o.betreuerId)?.name ?? 'Nicht zugewiesen'} · ${einheitenVon(o.id).length} Einheiten`),
                h('small', {}, Object.entries(status360(o.id)).filter(([, v]) => v.zustand === 'kritisch' || v.zustand === 'achtung').map(([k, v]) => `${k}: ${v.text}`).join(' · ') || 'Alles im Plan'))))))
          : h('p', { class: 'vw-leer' }, 'In dieser Ansicht gibt es keine Objekte.'),
        h('p', { class: 'vw-fein' }, 'Grün: im Plan · Gelb: etwas steht an · Rot: Handlungsbedarf · Grau: nicht gebucht'))));
}

type Punkt = { datum: string; text: string; art: string; farbe: string; ziel: string };
/** Was ansteht – für ein Objekt oder (ohne Angabe) für alle Objekte der aktuellen Ansicht. */
export function wichtigFuer(objektId?: string): Punkt[] {
  const quelle = (art: string) => (objektId ? alle(art).filter((x) => objektIdVon(art, x) === objektId) : ds(art));
  const h0 = heute();
  const mit = (t: string, id?: string) => (objektId ? t : `${t} · ${finde('objekte', id)?.bezeichnung ?? ''}`);
  return [
    ...quelle('vorgaenge').filter((x) => x.status !== 'Erledigt' && x.kategorie === 'Notfall').map((x) => ({ datum: x.gemeldet, text: mit(x.titel, x.objektId), art: 'Notfall', farbe: 'rot', ziel: '#/liste/vorgaenge' })),
    ...quelle('fristen').filter((x) => !x.erledigt && tageBis(x.faellig) <= 30).map((x) => ({ datum: x.faellig, text: mit(x.art, x.objektId), art: 'Frist', farbe: x.faellig < h0 ? 'rot' : 'gelb', ziel: '#/liste/fristen' })),
    ...quelle('service').filter((x) => x.rhythmus !== 'Nach Bedarf' && x.naechster <= h0).map((x) => ({ datum: x.naechster, text: mit(x.leistung, x.objektId), art: 'Dienst', farbe: x.naechster < h0 ? 'rot' : 'blau', ziel: '#/tagesplan' })),
    ...quelle('rechnungen').filter(rechnungUeberfaellig).map((x) => ({ datum: x.faellig, text: `Rechnung ${x.nummer ?? ''} überfällig · ${finde('kunden', x.kundeId)?.name ?? ''}`, art: 'Rechnung', farbe: 'rot', ziel: `#/rechnung/${x.id}` })),
    ...quelle('aufgaben').filter((x) => !x.erledigt && x.faellig && tageBis(x.faellig) <= 7).map((x) => ({ datum: x.faellig, text: x.titel, art: 'Aufgabe', farbe: x.faellig < h0 ? 'rot' : 'gelb', ziel: '#/aufgaben' })),
    ...quelle('vertraege').filter((x) => x.kuendigenBis && tageBis(x.kuendigenBis) >= 0 && tageBis(x.kuendigenBis) <= 60).map((x) => ({ datum: x.kuendigenBis, text: mit(`Kündbar bis: ${x.art} · ${x.partner}`, x.objektId), art: 'Vertrag', farbe: 'gelb', ziel: '#/liste/vertraege' })),
  ].sort((a, b) => a.datum.localeCompare(b.datum));
}
export const wichtigListe = (punkte: Punkt[], max = 12) => punkte.length
  ? h('ul', { class: 'vw-punkte' }, punkte.slice(0, max).map((p) => h('li', {}, h('a', { href: p.ziel }, marke(p.art, p.farbe), h('span', { class: 'vw-punkte__text' }, p.text), h('span', { class: 'vw-punkte__datum' }, datum(p.datum))))))
  : h('p', { class: 'vw-leer' }, 'Nichts Dringendes. Alles ist im Plan.');

let reiter = 'Übersicht';

/** Auswahl eines Mitarbeiters für ein Objekt (Betreuer oder Vertretung) */
export function personWahl(o: Satz, feld: 'betreuerId' | 'vertretungId'): HTMLElement {
  const leute = alle('mitarbeiter').filter((m) => m.aktiv !== false || m.id === o[feld]);
  return h('select', { 'aria-label': feld === 'betreuerId' ? 'Objektbetreuer' : 'Vertretung',
    onchange: (e: Event) => {
      const alt = o[feld] as string;
      const neu = (e.target as HTMLSelectElement).value;
      speichere('objekte', { id: o.id, [feld]: neu });
      if (feld === 'betreuerId' && neu) {
        unverteiltZuweisen(o.id, neu);
        const arbeit = alt && alt !== neu ? offeneArbeit([o.id], alt) : null;
        const n = arbeit ? arbeit.aufgaben.length + arbeit.meldungen.length : 0;
        if (arbeit && n && confirm(`${n} offene Aufgaben und Meldungen dieses Objekts liegen noch bei ${finde('mitarbeiter', alt)?.name ?? 'dem bisherigen Betreuer'}. Auch an ${finde('mitarbeiter', neu)?.name} übergeben?`)) arbeitUebergeben(arbeit, neu);
      }
      hinweis('Zuständigkeit gespeichert');
    } },
    h('option', { value: '' }, '– nicht zugewiesen –'), leute.map((m) => h('option', { value: m.id, selected: m.id === o[feld] }, m.name)));
}

/** Einheiten des Objekts mit dem jeweiligen Mieter – die Einheit ist Teil des Objekts. */
function einheitenTabelle(o: Satz): HTMLElement {
  const m0 = monatHeute();
  const zeilen = einheitenVon(o.id).map((e) => {
    const mv = alle('mieter').filter((x) => x.einheitId === e.id);
    const aktiv = mv.find((x) => aktivIm(x, m0));
    return { e, aktiv, offen: aktiv ? rueckstand(aktiv) : 0, bisher: mv.length };
  });
  const vermietbar = zeilen.filter((z) => z.e.art === 'Wohnung' || z.e.art === 'Gewerbe');
  return h('section', { class: 'vw-karte' },
    h('header', { class: 'vw-karte__kopf' },
      h('h2', {}, 'Einheiten & Mieter ', h('span', { class: 'vw-zahl' }, String(zeilen.length))),
      h('span', {}, `${vermietbar.filter((z) => z.aktiv).length} von ${vermietbar.length} vermietet`),
      h('button', { class: 'vw-knopf vw-knopf--voll', onclick: () => formular('einheiten', { objektId: o.id }) }, '+ Einheit')),
    h('div', { class: 'vw-tabelle' }, h('table', {},
      h('thead', {}, h('tr', {}, ['Einheit', 'Fläche', 'Mieter', 'Miete (Soll)', 'Rückstand', 'Stand', ''].map((t) => h('th', { scope: 'col' }, t)))),
      h('tbody', {}, zeilen.length ? zeilen.map(({ e, aktiv, offen }) => h('tr', { tabindex: 0, onclick: () => (aktiv ? formular('mieter', aktiv) : formular('mieter', { einheitId: e.id })),
          onkeydown: (ev: KeyboardEvent) => { if (ev.key === 'Enter') (ev.currentTarget as HTMLElement).click(); } },
        h('td', { 'data-spalte': 'Einheit' }, h('strong', {}, e.bezeichnung), e.lage && h('small', { class: 'vw-block' }, e.lage)),
        h('td', { 'data-spalte': 'Fläche', class: 'vw-zahlspalte' }, e.flaeche ? `${e.flaeche} m²` : '–'),
        h('td', { 'data-spalte': 'Mieter' }, aktiv?.name ?? '–'),
        h('td', { 'data-spalte': 'Miete (Soll)', class: 'vw-zahlspalte' }, aktiv ? geld(soll(aktiv)) : '–'),
        h('td', { 'data-spalte': 'Rückstand', class: 'vw-zahlspalte' }, offen > 0 ? h('strong', {}, geld(offen)) : '–'),
        h('td', { 'data-spalte': 'Stand' }, !(e.art === 'Wohnung' || e.art === 'Gewerbe') ? marke(e.art, 'grau') : aktiv ? (offen > 0 ? marke(mahnstufe(aktiv).text, mahnstufe(aktiv).stufe >= 2 ? 'rot' : 'gelb') : marke('Vermietet', 'gruen')) : marke('Leer', 'gelb')),
        h('td', { class: 'vw-aktion' },
          aktiv ? h('button', { class: 'vw-knopf vw-knopf--klein', onclick: (ev: Event) => { ev.stopPropagation(); aktionen.mieterwechsel?.(aktiv); } }, 'Auszug …')
                : (e.art === 'Wohnung' || e.art === 'Gewerbe') && h('button', { class: 'vw-knopf vw-knopf--klein', onclick: (ev: Event) => { ev.stopPropagation(); formular('mieter', { einheitId: e.id }); } }, 'Vermieten'),
          ' ', h('button', { class: 'vw-knopf vw-knopf--klein', onclick: (ev: Event) => { ev.stopPropagation(); formular('einheiten', e); } }, 'Einheit'))))
        : [h('tr', {}, h('td', { colspan: 7, class: 'vw-leer' }, 'Legen Sie die Einheiten dieses Objekts an: Wohnungen, Gewerbe, Stellplätze.'))]))));
}

/** Mietkonto des Objekts: Admins pflegen es hier, Mitarbeiter sehen es nur. */
function mietkontoBlock(o: Satz, L: (art: string, extra?: Partial<Satz>) => HTMLElement): HTMLElement {
  if (modus() !== 'server' || istAdmin()) return L('mietkonten');
  const konten = alle('mietkonten').filter((k) => k.objektId === o.id);
  return h('section', { class: 'vw-karte' }, h('header', { class: 'vw-karte__kopf' }, h('h2', {}, 'Mietkonto')),
    konten.length ? h('dl', { class: 'vw-info vw-info--innen' }, konten.map((k) => [h('dt', {}, k.bezeichnung), h('dd', {}, [k.inhaber, k.iban, k.bank].filter(Boolean).join(' · '))]))
      : h('p', { class: 'vw-leer' }, 'Noch kein Mietkonto hinterlegt. Ein Admin-Zugang kann es hier eintragen.'),
    h('p', { class: 'vw-fein vw-innen' }, 'Ändern kann nur ein Admin-Zugang.'));
}

function objektSeite(id: string): HTMLElement {
  const o = finde('objekte', id);
  if (!o) return h('p', { class: 'vw-leer' }, 'Dieses Objekt gibt es nicht mehr. ', h('a', { href: '#/liste/objekte' }, 'Zur Objektliste'));
  const einheiten = einheitenVon(id);
  const mieter = mieterVon(id).filter((x) => aktivIm(x, monatHeute()));
  const kunde = finde('kunden', o.kundeId);
  const vg = { objektId: id };
  const eigene = (s: Satz) => s.objektId === id;
  const L = (art: string, extra: Partial<Satz> = {}) => liste(art, { filter: eigene, vorgaben: { ...vg, ...extra }, ohneSpalte: 'objektId', kompakt: true });
  const inhalt: Record<string, () => HTMLElement[]> = {
    'Übersicht': () => [h('div', { class: 'vw-zwei' },
      h('section', { class: 'vw-karte' },
        h('header', { class: 'vw-karte__kopf' }, h('h2', {}, 'Jetzt wichtig')),
        wichtigListe(wichtigFuer(id), 10)),
      h('section', { class: 'vw-karte vw-text' },
        h('h2', {}, 'Das Objekt'),
        h('dl', { class: 'vw-info' },
          h('dt', {}, 'Objektart'), h('dd', {}, o.art ?? '–'),
          h('dt', {}, 'Kunde'), h('dd', {}, kunde ? `${kunde.name} (${kunde.kundennummer})` : '–'),
          h('dt', {}, 'Gebuchte Leistungen'), h('dd', {}, (o.leistungen ?? []).join(', ') || '–'),
          h('dt', {}, 'Baujahr'), h('dd', {}, o.baujahr || '–'),
          h('dt', {}, 'Mietspiegel'), h('dd', {}, o.mietspiegel || '–'),
          o.notiz && [h('dt', {}, 'Notiz'), h('dd', {}, o.notiz)]))),
      liste('aufgaben', { filter: (s) => s.objektId === id && !s.erledigt, vorgaben: { objektId: id }, ohneSpalte: 'objektId', titel: 'Offene Aufgaben', kompakt: true })],
    'Einheiten & Mieter': () => [einheitenTabelle(o)],
    Verwalten: () => [
      mietkontoBlock(o, L),
      L('fristen'), L('vertraege'), L('kosten'), L('zaehler'), L('schluessel'), L('vereinbarungen'), L('dokumente', { datum: heute() }),
      ...(String(o.art).includes('WEG') ? [L('versammlungen'), L('beschluesse')] : []),
    ],
    Betreuen: () => [L('service', { naechster: heute() }), L('vorgaenge', { gemeldet: heute() }), L('einsaetze', { datum: heute() })],
    Erneuern: () => [L('auftraege')],
    Entwickeln: () => [L('projekte')],
  };
  const st = status360(id);
  return h('div', { class: 'vw-stapel' },
    h('header', { class: 'vw-seitenkopf vw-seitenkopf--objekt' },
      h('div', {},
        h('p', { class: 'vw-pfad' }, h('a', { href: '#/liste/objekte' }, 'Objekte'), ' / ', o.art),
        h('h1', {}, o.bezeichnung),
        h('p', {}, [o.strasse, o.ort].filter(Boolean).join(', ') || 'Keine Adresse hinterlegt', kunde && [' · Kunde: ', h('strong', {}, kunde.name), ` (${kunde.kundennummer})`]),
        h('div', { class: 'vw-team' },
          h('label', {}, h('span', {}, 'Objektbetreuer'), personWahl(o, 'betreuerId')),
          h('label', {}, h('span', {}, 'Vertretung'), personWahl(o, 'vertretungId'))),
        h('div', { class: 'vw-reihe' },
          h('button', { class: 'vw-knopf', onclick: () => formular('objekte', o) }, 'Objekt bearbeiten'),
          h('a', { class: 'vw-knopf', href: `#/nebenkosten/${id}` }, 'Nebenkostenabrechnung'),
          h('a', { class: 'vw-knopf', href: `#/bericht/${id}` }, 'Eigentümerbericht'),
          h('a', { class: 'vw-knopf', href: `#/abrechnung/${id}` }, 'Eigentümerabrechnung'))),
      h('div', { class: 'vw-ringblock' }, ring(id, true), ringLegende(id))),
    h('div', { class: 'vw-kennzahlen' },
      kennzahl(String(einheiten.length), 'Einheiten'),
      kennzahl(String(mieter.length), 'laufende Mietverhältnisse'),
      kennzahl(geld(mieter.reduce((sum, x) => sum + soll(x), 0)), 'Sollmiete im Monat'),
      kennzahl(geld(mieterVon(id).reduce((sum, x) => sum + rueckstand(x), 0)), 'offene Mieten')),
    h('div', { class: 'vw-reiter', role: 'tablist' }, Object.keys(inhalt).map((name) =>
      h('button', { role: 'tab', 'aria-selected': String(reiter === name), class: reiter === name ? 'ist-aktiv' : '', onclick: () => { reiter = name; zeichne(); } },
        st[name as keyof typeof st] && h('span', { class: 'vw-punkt', style: `background:${FARBE[st[name as keyof typeof st].zustand]}` }), name))),
    ...inhalt[reiter]());
}

let mietMonat = monatHeute();
function mieten(): HTMLElement {
  const aktive = ds('mieter').filter((x) => aktivIm(x, mietMonat));
  const zeilen = aktive.map((m) => ({ m, soll: sollIm(m, mietMonat), ist: gezahlt(m, mietMonat), offen: rueckstand(m), stufe: mahnstufe(m) }));
  const sumSoll = zeilen.reduce((s, z) => s + z.soll, 0);
  const sumIst = zeilen.reduce((s, z) => s + z.ist, 0);
  const fehlend = zeilen.filter((z) => z.ist < z.soll - 0.005);
  const buche = (m: Satz, betrag: number) => formular('zahlungen', { mieterId: m.id, monat: mietMonat, betrag: Math.round(betrag * 100) / 100, datum: heute() });
  const leerstand = ds('einheiten').filter((e) => (e.art === 'Wohnung' || e.art === 'Gewerbe') && !aktive.some((m) => m.einheitId === e.id));
  return h('div', { class: 'vw-stapel' },
    h('header', { class: 'vw-seitenkopf' }, h('h1', {}, 'Mieten'), h('p', {}, 'Sollstellung und Zahlungseingang je Monat. Rückstände werden über die gesamte Mietdauer gerechnet.')),
    h('div', { class: 'vw-reihe vw-monat' },
      h('button', { class: 'vw-knopf', 'aria-label': 'Vorheriger Monat', onclick: () => { mietMonat = monatPlus(mietMonat, -1); zeichne(); } }, '←'),
      h('strong', {}, monatText(mietMonat)),
      h('button', { class: 'vw-knopf', 'aria-label': 'Nächster Monat', onclick: () => { mietMonat = monatPlus(mietMonat, 1); zeichne(); } }, '→'),
      mietMonat !== monatHeute() && h('button', { class: 'vw-knopf', onclick: () => { mietMonat = monatHeute(); zeichne(); } }, 'Aktueller Monat'),
      h('span', { class: 'vw-platz' }),
      fehlend.length > 0 && h('button', { class: 'vw-knopf', onclick: () => {
        if (!confirm(`Für ${fehlend.length} Mietverhältnis(se) den fehlenden Betrag für ${monatText(mietMonat)} als heute eingegangen buchen?`)) return;
        fehlend.forEach((z) => speichere('zahlungen', { mieterId: z.m.id, monat: mietMonat, betrag: Math.round((z.soll - z.ist) * 100) / 100, datum: heute() }));
        hinweis(`${fehlend.length} Zahlungen gebucht`);
      } }, 'Alle fehlenden als eingegangen buchen')),
    h('div', { class: 'vw-kennzahlen' },
      kennzahl(geld(sumSoll), 'Soll'), kennzahl(geld(sumIst), 'Eingegangen'),
      kennzahl(geld(Math.max(0, sumSoll - sumIst)), 'fehlt in diesem Monat', undefined, sumSoll - sumIst > 0.005 ? 'vw-kennzahl--gelb' : ''),
      kennzahl(geld(ds('mieter').reduce((s, x) => s + rueckstand(x), 0)), 'Rückstand insgesamt', undefined, 'vw-kennzahl--rot')),
    h('section', { class: 'vw-karte' }, h('div', { class: 'vw-tabelle' }, h('table', {},
      h('thead', {}, h('tr', {}, ['Einheit', 'Mieter', 'Soll', 'Eingegangen', 'Rückstand gesamt', 'Stand', ''].map((t) => h('th', { scope: 'col' }, t)))),
      h('tbody', {}, zeilen.length ? zeilen.map((z) => h('tr', {},
        h('td', { 'data-spalte': 'Einheit' }, ARTEN.einheiten.anzeige(finde('einheiten', z.m.einheitId) ?? ({} as Satz))),
        h('td', { 'data-spalte': 'Mieter' }, h('a', { href: '#', onclick: (e: Event) => { e.preventDefault(); formular('mieter', z.m); } }, z.m.name)),
        h('td', { 'data-spalte': 'Soll', class: 'vw-zahlspalte' }, geld(z.soll)),
        h('td', { 'data-spalte': 'Eingegangen', class: 'vw-zahlspalte' }, geld(z.ist)),
        h('td', { 'data-spalte': 'Rückstand gesamt', class: 'vw-zahlspalte' }, z.offen > 0 ? h('strong', {}, geld(z.offen)) : '–'),
        h('td', { 'data-spalte': 'Stand' }, marke(z.stufe.text, ['gruen', 'gelb', 'gelb', 'rot'][z.stufe.stufe])),
        h('td', { class: 'vw-aktion' },
          z.offen > 0 && h('a', { class: 'vw-knopf vw-knopf--klein', href: `#/brief/${z.stufe.stufe >= 2 ? 'mahnung' : 'erinnerung'}/${z.m.id}` }, z.stufe.stufe >= 2 ? 'Mahnung' : 'Erinnerung'), ' ',
          h('button', { class: 'vw-knopf vw-knopf--klein', onclick: () => buche(z.m, Math.max(0, z.soll - z.ist) || z.soll) }, 'Zahlung buchen'))))
        : [h('tr', {}, h('td', { colspan: 7, class: 'vw-leer' }, 'In diesem Monat läuft kein Mietverhältnis. Legen Sie unter „Mietverhältnisse“ eines an.'))])))),
    leerstand.length > 0 && h('section', { class: 'vw-karte vw-karte--kompakt' },
      h('header', { class: 'vw-karte__kopf' }, h('h3', {}, 'Leerstand ', h('span', { class: 'vw-zahl' }, String(leerstand.length)))),
      h('ul', { class: 'vw-punkte' }, leerstand.map((e) => h('li', {}, h('a', { href: `#/objekt/${e.objektId}` }, marke('Leer', 'gelb'), h('span', { class: 'vw-punkte__text' }, ARTEN.einheiten.anzeige(e)), h('span', { class: 'vw-punkte__datum' }, e.flaeche ? `${e.flaeche} m²` : '')))))));
}

let nkJahr = new Date().getFullYear() - 1;
function nebenkostenSeite(objektId?: string): HTMLElement {
  const objekte = ds('objekte');
  const id = objektId && finde('objekte', objektId) ? objektId : objekte[0]?.id;
  const kopf = h('header', { class: 'vw-seitenkopf vw-nichtdrucken' }, h('h1', {}, 'Nebenkostenabrechnung'),
    h('p', {}, 'Umlagefähige Belege eines Jahres werden nach Schlüssel auf die Mietverhältnisse verteilt. Leerstand trägt der Eigentümer.'));
  if (!id) return h('div', { class: 'vw-stapel' }, kopf, h('p', { class: 'vw-leer' }, 'Legen Sie zuerst ein Objekt an.'));
  const o = finde('objekte', id)!;
  const r = nebenkosten(id, nkJahr);
  const wahl = h('div', { class: 'vw-reihe vw-nichtdrucken' },
    h('label', { class: 'sr-only', for: 'nk-objekt' }, 'Objekt'),
    h('select', { id: 'nk-objekt', onchange: (e: Event) => (location.hash = `#/nebenkosten/${(e.target as HTMLSelectElement).value}`) }, objekte.map((x) => h('option', { value: x.id, selected: x.id === id }, x.bezeichnung))),
    h('button', { class: 'vw-knopf', 'aria-label': 'Jahr zurück', onclick: () => { nkJahr--; zeichne(); } }, '←'), h('strong', {}, `Abrechnungsjahr ${nkJahr}`),
    h('button', { class: 'vw-knopf', 'aria-label': 'Jahr vor', onclick: () => { nkJahr++; zeichne(); } }, '→'),
    h('span', { class: 'vw-platz' }),
    h('button', { class: 'vw-knopf', onclick: () => formular('kosten', { objektId: id, datum: `${nkJahr}-12-31` }) }, '+ Beleg'),
    h('a', { class: 'vw-knopf vw-knopf--voll', href: `#/nkbriefe/${id}/${nkJahr}` }, 'Abrechnungen an Mieter (Briefe)'));
  if (!r.kostenarten.length) return h('div', { class: 'vw-stapel' }, kopf, wahl, h('p', { class: 'vw-leer' }, `Für ${o.bezeichnung} gibt es im Jahr ${nkJahr} noch keine umlagefähigen Belege.`));
  return h('div', { class: 'vw-stapel' }, kopf, wahl,
    r.ohneFlaeche && h('p', { class: 'vw-warnung' }, 'Bei mindestens einer Einheit fehlt die Wohnfläche. Die Verteilung nach Fläche ist dadurch nicht korrekt.'),
    h('p', { class: 'vw-fein' }, `Die Abrechnung für ${nkJahr} muss den Mietern bis zum 31.12.${nkJahr + 1} zugehen (§ 556 Abs. 3 BGB). Vorauszahlungen sind als Soll gerechnet; bitte vor dem Versand prüfen.`),
    h('section', { class: 'vw-karte' },
      h('header', { class: 'vw-karte__kopf' }, h('h2', {}, `${o.bezeichnung} · Kosten ${nkJahr}`)),
      h('div', { class: 'vw-tabelle' }, h('table', {},
        h('thead', {}, h('tr', {}, h('th', {}, 'Kostenart'), h('th', {}, 'Schlüssel'), h('th', { class: 'vw-zahlspalte' }, 'Betrag'))),
        h('tbody', {}, r.kostenarten.map((k) => h('tr', {}, h('td', {}, k.art), h('td', {}, k.schluessel), h('td', { class: 'vw-zahlspalte' }, geld(k.summe))))),
        h('tfoot', {},
          h('tr', {}, h('th', { colspan: 2 }, 'Umlagefähige Kosten gesamt'), h('th', { class: 'vw-zahlspalte' }, geld(r.gesamt))),
          h('tr', {}, h('td', { colspan: 2 }, 'davon auf Mieter umgelegt'), h('td', { class: 'vw-zahlspalte' }, geld(r.umgelegt))),
          h('tr', {}, h('td', { colspan: 2 }, 'Anteil Eigentümer (Leerstand)'), h('td', { class: 'vw-zahlspalte' }, geld(r.eigentuemer))))))),
    ...r.zeilen.map((z) => h('section', { class: 'vw-karte vw-abrechnung' },
      h('header', { class: 'vw-karte__kopf' }, h('h2', {}, z.mieter.name), h('span', {}, `${z.einheit.bezeichnung} · ${z.monate} von 12 Monaten`)),
      h('div', { class: 'vw-tabelle' }, h('table', {},
        h('tbody', {}, z.posten.map((p) => h('tr', {}, h('td', {}, p.art), h('td', {}, p.schluessel), h('td', { class: 'vw-zahlspalte' }, geld(p.betrag))))),
        h('tfoot', {},
          h('tr', {}, h('th', { colspan: 2 }, 'Anteil an den Kosten'), h('th', { class: 'vw-zahlspalte' }, geld(z.summe))),
          h('tr', {}, h('td', { colspan: 2 }, 'Vorauszahlungen (Soll)'), h('td', { class: 'vw-zahlspalte' }, geld(-z.voraus))),
          h('tr', { class: z.saldo > 0 ? 'vw-nachzahlung' : 'vw-guthaben' }, h('th', { colspan: 2 }, z.saldo > 0 ? 'Nachzahlung' : 'Guthaben'), h('th', { class: 'vw-zahlspalte' }, geld(Math.abs(z.saldo))))))))));
}

function tagesplan(): HTMLElement {
  const h0 = heute();
  const dienste = ds('service').filter((x) => x.rhythmus !== 'Nach Bedarf').sort((a, b) => a.naechster.localeCompare(b.naechster));
  const gruppe = (titel: string, saetze: Satz[], farbe: string) => saetze.length > 0 && h('section', { class: 'vw-karte' },
    h('header', { class: 'vw-karte__kopf' }, h('h2', {}, titel, ' ', h('span', { class: 'vw-zahl' }, String(saetze.length)))),
    h('ul', { class: 'vw-dienste' }, saetze.map((s) => h('li', {},
      h('div', {}, h('strong', {}, s.leistung), h('span', {}, finde('objekte', s.objektId)?.bezeichnung ?? '', s.wer ? ` · ${s.wer}` : ''), s.notiz && h('small', {}, s.notiz)),
      marke(datum(s.naechster), farbe),
      h('button', { class: 'vw-knopf vw-knopf--voll', onclick: () => dienstErledigt(s) }, 'Erledigt')))));
  const bedarf = ds('service').filter((x) => x.rhythmus === 'Nach Bedarf');
  return h('div', { class: 'vw-stapel' },
    h('header', { class: 'vw-seitenkopf' }, h('h1', {}, 'Tagesplan'), h('p', {}, 'Alle fälligen Dienste auf einen Blick. „Erledigt“ hält den Einsatz mit Datum und Uhrzeit fest und setzt den nächsten Termin.')),
    gruppe('Überfällig', dienste.filter((x) => x.naechster < h0), 'rot'),
    gruppe('Heute', dienste.filter((x) => x.naechster === h0), 'blau'),
    gruppe('In den nächsten 7 Tagen', dienste.filter((x) => x.naechster > h0 && x.naechster <= datumPlus(h0, 7)), 'grau'),
    !dienste.some((x) => x.naechster <= datumPlus(h0, 7)) && h('p', { class: 'vw-leer' }, 'In den nächsten sieben Tagen steht kein Dienst an.'),
    bedarf.length > 0 && h('section', { class: 'vw-karte' },
      h('header', { class: 'vw-karte__kopf' }, h('h2', {}, 'Nach Bedarf'), h('span', {}, 'z. B. Winterdienst: Einsatz mit einem Klick dokumentieren')),
      h('ul', { class: 'vw-dienste' }, bedarf.map((s) => h('li', {},
        h('div', {}, h('strong', {}, s.leistung), h('span', {}, finde('objekte', s.objektId)?.bezeichnung ?? ''), s.notiz && h('small', {}, s.notiz)),
        h('button', { class: 'vw-knopf vw-knopf--voll', onclick: () => dienstErledigt(s) }, 'Einsatz dokumentieren'))))));
}

function daten(): HTMLElement {
  const datei = h('input', { type: 'file', accept: 'application/json,.json', class: 'sr-only', id: 'vw-import', onchange: async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    if (!confirm(modus() === 'server'
      ? 'Die Sicherung ersetzt ALLE Daten in der Datenbank – für alle Mitarbeiter. Alles, was nach dieser Sicherung eingetragen wurde, geht verloren. Fortfahren?'
      : 'Die Sicherung ersetzt alle Daten in diesem Browser. Fortfahren?')) { (e.target as HTMLInputElement).value = ''; return; }
    try { importiere(await f.text()); hinweis('Sicherung eingespielt'); } catch (fehler) { alert((fehler as Error).message || 'Die Datei konnte nicht gelesen werden.'); }
  } });
  const anzahl = Object.keys(ARTEN).reduce((s, k) => s + alle(k).length, 0);
  return h('div', { class: 'vw-stapel' },
    h('header', { class: 'vw-seitenkopf' }, h('h1', {}, 'Daten & Sicherung')),
    h('section', { class: 'vw-karte vw-text' },
      h('h2', {}, 'Wo liegen die Daten?'),
      modus() === 'server'
        ? [h('p', {}, 'Die Daten liegen in der ', h('strong', {}, 'Datenbank auf Ihrem Webspace'), '. Jede Änderung wird sofort dorthin gespeichert; angemeldete Kolleginnen und Kollegen sehen sie nach kurzer Zeit. Der Browser hält die Daten nur im Arbeitsspeicher.'),
           h('p', {}, h('strong', {}, 'Sicherung:'), ` Jede Nacht wird automatisch eine verschlüsselte Sicherung angelegt und 30 Tage aufbewahrt (GitHub, Workflow „Nächtliche Datensicherung“). Zusätzlich können Sie hier jederzeit eine Kopie herunterladen. Aktuell sind ${anzahl} Einträge gespeichert.`),
           h('p', {}, h('small', {}, 'Heruntergeladene Sicherungen enthalten personenbezogene Daten. Bewahren Sie sie geschützt auf und löschen Sie sie, wenn sie nicht mehr gebraucht werden.'))]
        : [h('p', {}, 'Dies ist der ', h('strong', {}, 'Demo-Modus'), ': Alle Eingaben werden ', h('strong', {}, 'nur im Browser dieses Geräts'), ' gespeichert, sind auf keinem anderen Gerät sichtbar und gehen verloren, wenn die Browserdaten gelöscht werden.'),
           h('p', {}, h('strong', {}, 'Sichern Sie deshalb regelmäßig.'), ` Aktuell sind ${anzahl} Einträge gespeichert.`)],
      h('div', { class: 'vw-reihe' },
        h('button', { class: 'vw-knopf vw-knopf--voll', onclick: () => {
          const a = h('a', { href: URL.createObjectURL(new Blob([exportiere()], { type: 'application/json' })), download: `hadie-verwaltung-${heute()}.json` });
          document.body.append(a); a.click(); a.remove(); hinweis('Sicherung heruntergeladen');
        } }, 'Sicherung herunterladen'),
        (modus() !== 'server' || istAdmin()) && [h('label', { class: 'vw-knopf', for: 'vw-import' }, 'Sicherung einspielen'), datei])),
    modus() !== 'server' && h('section', { class: 'vw-karte vw-text' },
      h('h2', {}, 'Ausprobieren'),
      h('p', {}, 'Beispieldaten zeigen das Tool mit zwei erfundenen Objekten. Sie ersetzen die vorhandenen Daten.'),
      h('div', { class: 'vw-reihe' },
        h('button', { class: 'vw-knopf', onclick: () => { if (istLeer() || confirm('Vorhandene Daten durch Beispieldaten ersetzen?')) { ersetze(beispieldaten()); hinweis('Beispieldaten geladen'); location.hash = '#/'; } } }, 'Beispieldaten laden'),
        h('button', { class: 'vw-knopf vw-knopf--gefahr', onclick: () => { if (confirm('Wirklich ALLE Daten in diesem Browser löschen? Das lässt sich nicht rückgängig machen.')) { ersetze({}); hinweis('Alle Daten gelöscht'); location.hash = '#/'; } } }, 'Alle Daten löschen'))));
}

/* ================= Navigation und Start ================= */
const NAV: { titel: string; punkte: [string, string][] }[] = [
  { titel: 'Überblick', punkte: [['Cockpit', '#/'], ['Kalender', '#/kalender'], ['Aufgaben', '#/aufgaben'], ['Website-Anfragen', '#/liste/anfragen']] },
  { titel: 'Objekte', punkte: [['Alle Objekte', '#/liste/objekte'], ['Kunden', '#/liste/kunden']] },
  { titel: KREISE.verwalten, punkte: [['Mieten', '#/mieten'], ['Bankabgleich', '#/bank'], ['Mieterhöhung', '#/mieterhoehung'], ['Kautionen', '#/kautionen'], ['Nebenkosten', '#/nebenkosten'], ['Kosten & Belege', '#/liste/kosten'], ['Fristen & Wartungen', '#/liste/fristen'], ['Verträge', '#/liste/vertraege']] },
  { titel: KREISE.betreuen, punkte: [['Tagesplan', '#/tagesplan'], ['Serviceplan', '#/liste/service'], ['Meldungen & Schäden', '#/liste/vorgaenge'], ['Einsatznachweise', '#/liste/einsaetze']] },
  { titel: KREISE.erneuern, punkte: [['Renovierung & Sanierung', '#/liste/auftraege']] },
  { titel: KREISE.entwickeln, punkte: [['Großprojekte', '#/liste/projekte']] },
  { titel: 'Abrechnung', punkte: [['Eigentümerabrechnung', '#/abrechnung'], ['Rechnungen', '#/rechnungen'], ['Preisvereinbarungen', '#/liste/vereinbarungen']] },
  { titel: 'Stammdaten', punkte: [['Firmen & Handwerker', '#/liste/firmen']] },
];
/** Navigation je nach Rolle: Admins sehen die Administration, Mitarbeiter „Mein Zugang“. */
function navGruppen() {
  const admin = modus() !== 'server' || istAdmin();
  return admin
    ? [...NAV, { titel: 'Administration', punkte: [['Unternehmen', '#/unternehmen'], ['Mitarbeiter & Zugänge', '#/konten'], ['Objekt-Zuweisung', '#/team'], ['Daten & Sicherung', '#/daten']] as [string, string][] }]
    : NAV.map((g) => (g.titel === 'Stammdaten' ? { ...g, punkte: [...g.punkte, ['Mein Zugang & Kunden-Zugänge', '#/konten'] as [string, string]] } : g));
}

let buehne: HTMLElement;
let navEl: HTMLElement;

function ansicht(): HTMLElement {
  const [, bereich, id, id2] = location.hash.split('/');
  if (routen[bereich]) return routen[bereich](id, id2);
  if (bereich === 'liste' && ARTEN[id]) {
    const vorgaben: Partial<Satz> = id === 'vorgaenge' ? { gemeldet: heute() } : id === 'service' ? { naechster: heute() } : id === 'einsaetze' || id === 'kosten' || id === 'zaehler' ? { datum: heute() } : {};
    return h('div', { class: 'vw-stapel' }, liste(id, { vorgaben }));
  }
  if (bereich === 'objekt' && id) return objektSeite(id);
  if (bereich === 'mieten') return mieten();
  if (bereich === 'nebenkosten') return nebenkostenSeite(id);
  if (bereich === 'tagesplan') return tagesplan();
  if (bereich === 'daten') return modus() !== 'server' || istAdmin() ? daten() : h('section', { class: 'vw-karte vw-text' }, h('h2', {}, 'Nur für Admin-Zugänge'), h('p', {}, 'Datensicherung und Wiederherstellung kann nur ein Admin-Zugang öffnen.'));
  return cockpit();
}

const ansichtEls: HTMLSelectElement[] = [];
const neueAnsichtWahl = (klasse: string) => {
  const el = h('select', { class: klasse, 'aria-label': 'Zuständigkeit', onchange: () => { setzeAnsicht(el.value); zeichne(); } }) as HTMLSelectElement;
  ansichtEls.push(el);
  return el;
};
function ansichtOptionen() {
  const wahl = ansichtWahl();
  const mich = ich();
  const opt = (wert: string, text: string) => h('option', { value: wert, selected: wert === wahl || (wahl === mich?.id && wert === 'meine') }, text);
  ansichtEls.forEach((el) => el.replaceChildren(
    opt('alle', 'Alle Objekte'),
    ...(mich ? [opt('meine', 'Meine Objekte')] : []),
    ...alle('mitarbeiter').filter((m) => m.aktiv !== false && m.id !== mich?.id).map((m) => opt(m.id, `Objekte von ${m.name}`)),
    opt('offen', 'Nicht zugewiesen')));
}

export function zeichne() {
  if (!buehne) return;
  if (document.querySelector('dialog[open]')) return; // nicht unter einem offenen Formular neu aufbauen
  const y = window.scrollY;
  ansichtOptionen();
  const eingeschraenkt = ansichtId() !== 'alle';
  const alleObjekte = alle('objekte').length;
  const band = eingeschraenkt && alleObjekte > 0 && !location.hash.startsWith('#/team') && !location.hash.startsWith('#/objekt/')
    ? h('p', { class: 'vw-ansichtband' }, h('strong', {}, ansichtBeschreibung()), ` – ${sichtbareObjektIds()?.size ?? 0} von ${alleObjekte} Objekten. `,
        h('button', { type: 'button', onclick: () => { setzeAnsicht('alle'); zeichne(); } }, 'Alle anzeigen'))
    : null;
  buehne.replaceChildren(...(band ? [band] : []), ansicht());
  window.scrollTo(0, y);
  const hier = location.hash || '#/';
  navEl.querySelectorAll('a').forEach((a) => {
    const ziel = a.getAttribute('href')!;
    const aktiv = ziel === hier || (ziel !== '#/' && hier.startsWith(ziel)) || (ziel === '#/liste/objekte' && hier.startsWith('#/objekt/'));
    a.toggleAttribute('aria-current', aktiv);
  });
}

function suche(feld: HTMLInputElement, ausgabe: HTMLElement) {
  const q = feld.value.trim().toLowerCase();
  ausgabe.replaceChildren();
  ausgabe.hidden = q.length < 2;
  if (q.length < 2) return;
  const treffer: { art: string; s: Satz }[] = [];
  for (const [name, art] of Object.entries(ARTEN)) {
    for (const s of alle(name)) {
      if (treffer.length >= 12) break;
      if (art.felder.some((x) => x.typ !== 'ref' && wert(x, s).toLowerCase().includes(q))) treffer.push({ art: name, s });
    }
  }
  ausgabe.append(...(treffer.length
    ? treffer.map(({ art, s }) => h('button', { type: 'button', onclick: () => { feld.value = ''; ausgabe.hidden = true; art === 'objekte' ? (location.hash = `#/objekt/${s.id}`) : formular(art, s); } },
        h('strong', {}, ARTEN[art].anzeige(s)), h('span', {}, ARTEN[art].einzahl)))
    : [h('p', {}, 'Nichts gefunden.')]));
}

export function starte(wurzel: HTMLElement, nutzer: string, abmelden: () => void) {
  buehne = h('main', { class: 'vw-inhalt', id: 'inhalt' });
  const sicherung = h('span', { class: 'vw-sicherung', role: 'status', 'aria-live': 'polite' });
  beiSicherung((s, text) => {
    sicherung.dataset.zustand = modus() === 'server' ? s : 'demo';
    sicherung.textContent = modus() !== 'server' ? 'Demo · nur in diesem Browser' : s === 'speichert' ? 'Speichert …' : s === 'fehler' ? `⚠ ${text ?? 'Nicht gespeichert'}` : '● Gespeichert';
  });
  const ergebnis = h('div', { class: 'vw-suchergebnis', hidden: true });
  const suchfeld = h('input', { type: 'search', placeholder: 'Suchen …', 'aria-label': 'Alles durchsuchen', oninput: () => suche(suchfeld, ergebnis) }) as HTMLInputElement;
  navEl = h('nav', { class: 'vw-nav', id: 'vw-nav', 'aria-label': 'Verwaltung' },
    h('div', { class: 'vw-nav__gruppe vw-nav__ansicht' }, h('p', {}, 'Ansicht'), neueAnsichtWahl('vw-ansicht-nav')),
    navGruppen().map((g) => h('div', { class: 'vw-nav__gruppe' }, h('p', {}, g.titel), h('ul', {}, g.punkte.map(([text, ziel]) => h('li', {}, h('a', { href: ziel }, text)))))));
  const menue = h('button', { class: 'vw-menue', 'aria-controls': 'vw-nav', 'aria-expanded': 'false', 'aria-label': 'Navigation öffnen',
    onclick: () => { const offen = wurzel.classList.toggle('nav-offen'); menue.setAttribute('aria-expanded', String(offen)); } }, h('span'), h('span'), h('span'));
  navEl.addEventListener('click', (e) => { if ((e.target as Element).closest('a')) { wurzel.classList.remove('nav-offen'); menue.setAttribute('aria-expanded', 'false'); } });

  wurzel.replaceChildren(
    h('header', { class: 'vw-kopf' },
      menue,
      h('a', { class: 'vw-logo', href: '#/' }, h('strong', {}, 'HaDie'), h('span', {}, 'Verwaltung')),
      h('div', { class: 'vw-suchfeld' }, suchfeld, ergebnis),
      neueAnsichtWahl('vw-ansicht'),
      sicherung,
      h('span', { class: 'vw-nutzer' }, nutzer),
      h('button', { class: 'vw-knopf', onclick: abmelden }, 'Abmelden')),
    h('div', { class: 'vw-rumpf' }, navEl, buehne));

  document.addEventListener('click', (e) => { if (!(e.target as Element).closest('.vw-suchfeld')) ergebnis.hidden = true; });
  window.addEventListener('hashchange', () => { window.scrollTo(0, 0); zeichne(); });
  beiAenderung(zeichne);
  zeichne();
}
