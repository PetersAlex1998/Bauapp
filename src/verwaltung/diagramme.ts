/**
 * DIAGRAMME (SVG, ohne Fremdbibliothek)
 * ---------------------------------------------------------------
 * Ruhige, dünne Marken nach festen Regeln: Balken max. 24 px, 4 px gerundete
 * Datenenden, Linien 2 px, Punkte ≥ 8 px mit Ring in Flächenfarbe, Raster als
 * Haarlinie. Jede Grafik hat Hover-Infos und eine Tabellenansicht.
 * Farben: Reihe 1 = Markenblau, Reihe 2 = Orange (geprüft auf Farbsehschwäche).
 */
import { geld, h } from './app';

const NS = 'http://www.w3.org/2000/svg';
const s = (tag: string, attrs: Record<string, string | number> = {}, ...kinder: (Node | string)[]) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  kinder.forEach((k) => el.append(k));
  return el;
};
const euroKurz = (x: number) => (Math.abs(x) >= 10000 ? `${Math.round(x / 1000)} T€` : `${Math.round(x).toLocaleString('de-DE')} €`);

/** Angenehme Achsenschritte */
function skala(max: number, schritte = 4) {
  if (max <= 0) return { top: 1, ticks: [0] };
  const roh = max / schritte;
  const pot = 10 ** Math.floor(Math.log10(roh));
  const schritt = [1, 2, 2.5, 5, 10].map((f) => f * pot).find((x) => x >= roh)!;
  const top = Math.ceil(max / schritt) * schritt;
  return { top, ticks: Array.from({ length: Math.round(top / schritt) + 1 }, (_, i) => i * schritt) };
}

/** Pfad für einen Balken mit 4 px gerundetem oberem Ende, unten eckig */
function balkenPfad(x: number, y: number, b: number, hoehe: number, r = 4) {
  if (hoehe <= 0) return '';
  const rr = Math.min(r, hoehe, b / 2);
  return `M${x},${y + hoehe}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + b - rr}Q${x + b},${y} ${x + b},${y + rr}V${y + hoehe}Z`;
}

function tooltip(wrap: HTMLElement) {
  const t = h('div', { class: 'vw-diagramm__tip', role: 'status', hidden: true });
  wrap.append(t);
  return {
    zeige(zeilen: (string | Node)[], x: number, y: number) {
      t.replaceChildren(...zeilen.map((z) => h('div', {}, z)));
      t.hidden = false;
      const w = wrap.clientWidth;
      t.style.left = `${Math.min(Math.max(x, 70), w - 70)}px`;
      t.style.top = `${y}px`;
    },
    weg() { t.hidden = true; },
  };
}

function tabelle(titel: string, kopf: string[], zeilen: string[][]) {
  return h('details', { class: 'vw-diagramm__tabelle' }, h('summary', {}, 'Als Tabelle anzeigen'),
    h('div', { class: 'vw-tabelle' }, h('table', {}, h('caption', { class: 'sr-only' }, titel),
      h('thead', {}, h('tr', {}, kopf.map((k, i) => h('th', { scope: 'col', class: i ? 'vw-zahlspalte' : '' }, k)))),
      h('tbody', {}, zeilen.map((z) => h('tr', {}, z.map((c, i) => h(i ? 'td' : 'th', i ? { class: 'vw-zahlspalte' } : { scope: 'row' }, c))))))));
}

export type MonatsWert = { monat: string; ist: number; soll: number };
const monatKurz = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString('de-DE', { month: 'short', timeZone: 'UTC' }).replace('.', '');
const monatLang = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString('de-DE', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Mieteingänge je Monat: Balken (eingegangen) mit Linie (Soll laut Mietverträgen). */
export function mieteingangDiagramm(werte: MonatsWert[]): HTMLElement {
  const schmal = typeof window !== 'undefined' && window.innerWidth < 640;
  const W = schmal ? 380 : 720, H = schmal ? 230 : 260, L = schmal ? 46 : 56, R = schmal ? 8 : 16, O = 16, U = 30;
  const innenW = W - L - R, innenH = H - O - U;
  const { top, ticks } = skala(Math.max(1, ...werte.map((w) => Math.max(w.ist, w.soll))));
  const band = innenW / werte.length;
  const b = Math.min(24, band * 0.55);
  const y = (v: number) => O + innenH - (v / top) * innenH;
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'vw-diagramm__svg', role: 'img', 'aria-label': 'Mieteingänge der letzten 12 Monate im Vergleich zum Soll' });
  ticks.forEach((t) => svg.append(
    s('line', { x1: L, x2: W - R, y1: y(t), y2: y(t), class: t === 0 ? 'vw-d-basis' : 'vw-d-raster' }),
    s('text', { x: L - 8, y: y(t) + 4, 'text-anchor': 'end', class: 'vw-d-achse' }, euroKurz(t))));
  werte.forEach((w, i) => {
    const x = L + i * band + (band - b) / 2;
    svg.append(s('path', { d: balkenPfad(x, y(w.ist), b, y(0) - y(w.ist)), class: 'vw-d-reihe1' }));
    if (!schmal || (werte.length - 1 - i) % 2 === 0)
      svg.append(s('text', { x: L + i * band + band / 2, y: H - 10, 'text-anchor': 'middle', class: 'vw-d-achse' }, monatKurz(w.monat)));
  });
  const punkte = werte.map((w, i) => [L + i * band + band / 2, y(w.soll)] as const);
  svg.append(s('polyline', { points: punkte.map((p) => p.join(',')).join(' '), class: 'vw-d-linie2' }));
  const letzter = punkte[punkte.length - 1];
  svg.append(s('circle', { cx: letzter[0], cy: letzter[1], r: 4.5, class: 'vw-d-punkt2' }));
  // Hover: ganzer Monatsstreifen als Trefferfläche
  const fuehrung = s('line', { x1: 0, x2: 0, y1: O, y2: O + innenH, class: 'vw-d-fuehrung', visibility: 'hidden' });
  svg.append(fuehrung);
  const wrap = h('div', { class: 'vw-diagramm__flaeche' }, svg);
  const tip = tooltip(wrap);
  werte.forEach((w, i) => {
    const flaeche = s('rect', { x: L + i * band, y: O, width: band, height: innenH, fill: 'transparent', tabindex: 0, 'aria-label': `${monatLang(w.monat)}: eingegangen ${geld(w.ist)}, Soll ${geld(w.soll)}` });
    const an = () => {
      const cx = L + i * band + band / 2;
      fuehrung.setAttribute('x1', String(cx)); fuehrung.setAttribute('x2', String(cx)); fuehrung.setAttribute('visibility', 'visible');
      const fx = wrap.clientWidth / W;
      tip.zeige([h('strong', {}, monatLang(w.monat)), h('span', {}, h('i', { class: 'vw-d-chip vw-d-chip--1' }), `Eingegangen ${geld(w.ist)}`), h('span', {}, h('i', { class: 'vw-d-chip vw-d-chip--2' }), `Soll ${geld(w.soll)}`), w.soll > w.ist + 0.5 ? `Offen ${geld(w.soll - w.ist)}` : 'Vollständig eingegangen'], cx * fx, Math.min(y(w.ist), y(w.soll)) * fx - 8);
    };
    const aus = () => { fuehrung.setAttribute('visibility', 'hidden'); tip.weg(); };
    flaeche.addEventListener('mouseenter', an); flaeche.addEventListener('focus', an);
    flaeche.addEventListener('mouseleave', aus); flaeche.addEventListener('blur', aus);
    svg.append(flaeche);
  });
  const summeIst = werte.reduce((a, w) => a + w.ist, 0), summeSoll = werte.reduce((a, w) => a + w.soll, 0);
  return h('figure', { class: 'vw-diagramm' },
    h('div', { class: 'vw-diagramm__legende' },
      h('span', {}, h('i', { class: 'vw-d-chip vw-d-chip--1' }), 'Eingegangen'),
      h('span', {}, h('i', { class: 'vw-d-chip vw-d-chip--2 vw-d-chip--linie' }), 'Soll laut Mietverträgen')),
    wrap,
    h('figcaption', { class: 'vw-fein' }, `12 Monate: ${geld(summeIst)} eingegangen von ${geld(summeSoll)} Soll (${summeSoll ? Math.round((summeIst / summeSoll) * 100) : 0} %).`),
    tabelle('Mieteingänge je Monat', ['Monat', 'Eingegangen', 'Soll'], werte.map((w) => [monatLang(w.monat), geld(w.ist), geld(w.soll)])));
}

/** Waagrechte Balken für Anteile (eine Reihe, ohne Legende). */
export function balkenListe(eintraege: { name: string; wert: number }[], beschriftung: string): HTMLElement {
  const max = Math.max(1, ...eintraege.map((e) => e.wert));
  const summe = eintraege.reduce((a, e) => a + e.wert, 0);
  return h('figure', { class: 'vw-diagramm' },
    h('ul', { class: 'vw-balkenliste', 'aria-label': beschriftung }, eintraege.map((e) => h('li', {},
      h('span', { class: 'vw-balkenliste__name' }, e.name),
      h('span', { class: 'vw-balkenliste__spur', 'aria-hidden': 'true' }, h('span', { class: 'vw-balkenliste__balken', style: `width:${Math.max(2, (e.wert / max) * 100)}%` })),
      h('span', { class: 'vw-balkenliste__wert' }, geld(e.wert), h('small', {}, ` ${summe ? Math.round((e.wert / summe) * 100) : 0} %`))))),
    tabelle(beschriftung, ['Kostenart', 'Betrag'], eintraege.map((e) => [e.name, geld(e.wert)])));
}
