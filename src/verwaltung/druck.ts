/**
 * DRUCKRAHMEN – jeder Ausdruck im Briefbogen-Design, ohne Ausnahme.
 * ---------------------------------------------------------------
 *  • Brief (ein .vw-brief.din): Seite 1 DIN 5008 Form B, ab Seite 2 Kopfzeile
 *    „Firma · Betreff“ und „Seite x von y“.
 *  • Briefmappe (.din-mappe): Deckblätter und Folgeblätter regeln ihre Seiten selbst.
 *  • Jede andere Seite (Listen, Mieten, Kalender, Kundenbereich …): Briefkopf mit Logo,
 *    Titel und Datum oben auf Seite 1, Kopf- und Fußzeile mit Seitenzahl auf jeder Seite.
 * Die @page-Regeln werden hier gesetzt, weil sie Firmendaten und Titel enthalten.
 */
import { alle } from './speicher';
import { h } from './app';

const firma = () => alle('absender')[0] ?? { name: 'HaDie-Immobilien', strasse: 'Kirsperbaumweg 23', ort: '33175 Bad Lippspringe', telefon: '0160 9500 6184' };
const css = (t: string) => `"${String(t ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ')}"`;
const heuteText = () => new Date().toLocaleDateString('de-DE');

const kopfBox = (inhalt: string, seite: 'left' | 'right') => `@top-${seite} { content: ${inhalt}; font-family: Arial, Helvetica, sans-serif; font-size: 7.5pt; color: #555; vertical-align: bottom; padding-bottom: 3mm; border-bottom: 0.2mm solid #c9d0d8; ${seite === 'left' ? 'margin-left: 25mm; text-align: left;' : 'margin-right: 20mm; text-align: right;'} }`;
const seitenzahl = `"Seite " counter(page) " von " counter(pages)`;

const fussBoxen = (f: Record<string, any>) => {
  const text = [f.name, f.strasse, f.ort, f.telefon && `Telefon ${f.telefon}`, f.email].filter(Boolean).join(' · ');
  const stil = 'font-family: Arial, Helvetica, sans-serif; font-size: 6.8pt; color: #555; vertical-align: top; padding-top: 3mm; border-top: 0.2mm solid #c9d0d8;';
  return `@bottom-left { content: ${css(text)}; ${stil} margin-left: 25mm; width: 135mm; } @bottom-right { content: ${seitenzahl}; ${stil} margin-right: 20mm; width: 30mm; text-align: right; white-space: nowrap; }`;
};
/** Ganzformatige Dokumente (Verträge, Formulare, Protokolle): Kopf aus dem Dokument, Fuß im Seitenrand */
const dokSeite = (f: Record<string, any>) => `@page dok { size: A4; margin: 12mm 0 16mm 0; ${fussBoxen(f)} }`;

type Art = 'brief' | 'mappe' | 'dokument' | 'dok';
function regeln(art: Art, titel: string): string {
  const f = firma();
  if (art === 'dok') return `@page { size: A4; margin: 12mm 0 16mm 0; ${fussBoxen(f)} } ${dokSeite(f)}`;
  // Die Mappe beginnt immer mit einem Deckblatt (DIN-Briefkopf ab Blattoberkante)
  if (art === 'mappe') return `@page { size: A4; margin: 0 0 8mm 0; } @page deckblatt { margin: 0 0 8mm 0; } @page folgeblatt { margin: 20mm 0 12mm 0; } ${dokSeite(f)}`;
  if (art === 'brief') {
    // Alle Seiten mit gleichen Rändern: sonst lässt Chromium die feste Fußzeile auf Seite 2 weg.
    // Abstand oben auf Folgeseiten kommt aus dem Tabellenkopf des Briefs, die Kopfzeile aus .din__folgekopf.
    return `@page { size: A4; margin: 0 0 8mm 0; @bottom-right { content: ${seitenzahl}; font-family: Arial, Helvetica, sans-serif; font-size: 7pt; color: #555; margin-right: 20mm; vertical-align: middle; } }
      @page :first { @bottom-right { content: none; } }`;
  }
  const fuss = [f.name, f.strasse, f.ort, f.telefon && `Telefon ${f.telefon}`, f.email].filter(Boolean).join(' · ');
  return `@page { size: A4; margin: 20mm 0 16mm 0; ${kopfBox(css(`${f.name} · ${titel}`), 'left')} ${kopfBox(seitenzahl, 'right')}
      @bottom-left { content: ${css(fuss)}; font-family: Arial, Helvetica, sans-serif; font-size: 6.8pt; color: #555; vertical-align: top; padding-top: 3mm; border-top: 0.2mm solid #c9d0d8; margin-left: 25mm; }
      @bottom-right { content: ${seitenzahl}; font-family: Arial, Helvetica, sans-serif; font-size: 6.8pt; color: #555; vertical-align: top; padding-top: 3mm; border-top: 0.2mm solid #c9d0d8; margin-right: 20mm; text-align: right; } }
    @page :first { margin-top: 12mm; @top-left { content: none; border: 0; } @top-right { content: none; border: 0; } }`;
}

function setze(art: Art, titel: string) {
  let el = document.getElementById('vw-druckrahmen') as HTMLStyleElement | null;
  if (!el) { el = document.createElement('style'); el.id = 'vw-druckrahmen'; document.head.append(el); }
  el.textContent = `@media print { ${regeln(art, titel)} }`;
  document.documentElement.dataset.druck = art;
}

/** Briefkopf für Ausdrucke von Arbeitsseiten (am Bildschirm unsichtbar) */
export function druckkopf(titel: string, unterzeile = ''): HTMLElement {
  const f = firma();
  return h('header', { class: 'vw-druckkopf', 'aria-hidden': 'true' },
    h('div', {}, h('p', { class: 'vw-druckkopf__titel' }, titel), h('p', { class: 'vw-druckkopf__unter' }, [unterzeile, `Stand ${heuteText()}`].filter(Boolean).join(' · '))),
    f.logo ? h('img', { class: 'vw-druckkopf__logo', src: f.logo, alt: '' }) : h('p', { class: 'vw-druckkopf__firma' }, f.name));
}

/** Nach jedem Neuaufbau einer Seite aufrufen: wählt den passenden Druckrahmen. */
export function druckrahmen(wurzel: HTMLElement, ersatzTitel = 'Übersicht', festerTitel = false) {
  wurzel.querySelectorAll(':scope > .vw-druckkopf').forEach((x) => x.remove());
  if (wurzel.querySelector('.din-mappe')) return setze('mappe', '');
  const brief = wurzel.querySelector('.vw-brief.din');
  if (!brief && wurzel.querySelector('.vw-dok')) return setze('dok', '');
  if (brief) return setze('brief', brief.querySelector('.din__betreff')?.textContent?.trim() || 'Schreiben');
  const titel = festerTitel ? ersatzTitel : (wurzel.querySelector('h1') ?? wurzel.querySelector('h2'))?.textContent?.replace(/\s*\d+$/, '').trim() || ersatzTitel;
  wurzel.prepend(druckkopf(titel));
  setze('dokument', titel);
}

/** Ein einzelnes Blatt drucken (z. B. aus einem Dialog), ohne die Seite dahinter. */
export function druckeBlatt(blatt: HTMLElement) {
  const auftrag = h('div', { class: 'vw-druckauftrag vw' }, blatt);
  document.body.append(auftrag);
  document.body.classList.add('vw-druckt');
  const vorher = document.documentElement.dataset.druck;
  const stilVorher = document.getElementById('vw-druckrahmen')?.textContent ?? '';
  setze('brief', blatt.querySelector('.din__betreff')?.textContent?.trim() || 'Schreiben');
  const fertig = () => {
    auftrag.remove();
    document.body.classList.remove('vw-druckt');
    const el = document.getElementById('vw-druckrahmen');
    if (el) el.textContent = stilVorher;
    if (vorher) document.documentElement.dataset.druck = vorher;
  };
  window.addEventListener('afterprint', fertig, { once: true });
  setTimeout(() => window.print(), 50);
}
