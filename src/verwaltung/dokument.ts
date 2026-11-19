/**
 * DOKUMENT IM GANZFORMAT – für Verträge, Formulare und Protokolle
 * ---------------------------------------------------------------
 * Kein Anschriftfeld und kein Brieffenster, aber das gleiche Erscheinungsbild wie der
 * Briefbogen: Kopf mit Titel und Logo auf jeder Seite, Geschäftsangaben und Seitenzahl
 * unten (über den Druckrahmen). Briefe (mit Anschrift) bleiben beim DIN-Briefbogen.
 */
import { h } from './app';
import { absender, rechnungskonten } from './ansichten2';

type Inhalt = Node | string | false | null | undefined;

export function dokument(titel: string, unterzeile: string, ...inhalt: Inhalt[]): HTMLElement {
  const a = absender();
  const konten = rechnungskonten();
  return h('article', { class: 'vw-dok' },
    h('table', { class: 'dok__seiten', role: 'presentation' },
      // Tabellenkopf: wiederholt sich beim Drucken auf jeder Seite
      h('thead', {}, h('tr', {}, h('td', {},
        h('header', { class: 'dok__kopf' },
          h('div', {}, h('p', { class: 'dok__titel' }, titel), unterzeile && h('p', { class: 'dok__unter' }, unterzeile)),
          a.logo ? h('img', { class: 'dok__logo', src: a.logo, alt: a.name ?? 'Logo' }) : h('p', { class: 'dok__firma' }, a.name))))),
      h('tbody', {}, h('tr', {}, h('td', {}, h('div', { class: 'dok__text' }, ...inhalt.filter(Boolean) as Node[]))))),
    // Am Bildschirm: Fußzeile am Ende; im Druck übernimmt der Seitenrand diese Angaben
    h('footer', { class: 'dok__fuss' },
      [a.name, a.rechtsform && a.inhaber ? `${a.rechtsform}, Inh. ${a.inhaber}` : '', a.strasse, a.ort, a.telefon && `Telefon ${a.telefon}`, a.email, a.website].filter(Boolean).join(' · '),
      konten[0] ? ` · IBAN ${konten[0].iban}` : ''));
}

/** Text der Fußzeile für den Seitenrand beim Drucken */
export function dokFussText(): string {
  const a = absender();
  return [a.name, a.strasse, a.ort, a.telefon && `Telefon ${a.telefon}`, a.email, a.website].filter(Boolean).join(' · ');
}
