/**
 * BETRIEBSKOSTENABRECHNUNG ALS BRIEFMAPPE (DIN 5008)
 * ---------------------------------------------------------------
 * Je Mietverhältnis: Deckblatt im Briefbogen (Anschrift im Fenster, Ergebnis,
 * Zahlungshinweis, Einwendungsfrist) + Folgeblatt „Anlage“ im gleichen Design
 * (Kostenaufstellung, Verteilerschlüssel). Jede Abrechnung beginnt auf einer
 * neuen Seite; das Deckblatt ist immer genau ein Blatt, damit die Anschrift bei
 * jedem Mieter exakt im Fenster sitzt.
 */
import { finde, heute } from './speicher';
import { datumPlus, einheitenVon, nebenkosten, zahl } from './rechnen';
import { geld, h, marke, routen } from './app';
import { absender, bogen, briefInfo, gruss, mietkonto } from './ansichten2';

/** Kopf für Folgeblätter: gleiches Erscheinungsbild wie der Briefbogen */
export function folgekopf(titel: string, unterzeile: string, blatt: string): HTMLElement {
  const a = absender();
  return h('header', { class: 'din-folge__kopf' },
    h('div', {}, h('p', { class: 'din-folge__titel' }, titel), h('p', { class: 'din-folge__unter' }, unterzeile)),
    h('div', { class: 'din-folge__rechts' },
      a.logo ? h('img', { class: 'din-folge__logo', src: a.logo, alt: a.name ?? 'Logo' }) : h('p', { class: 'din-folge__firma' }, a.name),
      h('p', { class: 'din-folge__blatt' }, blatt)));
}
export function folgefuss(): HTMLElement {
  const a = absender();
  return h('footer', { class: 'din-folge__fuss' }, [a.name, a.strasse, a.ort, a.telefon && `Telefon ${a.telefon}`, a.email].filter(Boolean).join(' · '));
}

routen.nkbriefe = (objektId, jahrText) => {
  const o = finde('objekte', objektId);
  const jahr = Number(jahrText) || new Date().getFullYear() - 1;
  if (!o) return h('p', { class: 'vw-leer' }, 'Dieses Objekt gibt es nicht. ', h('a', { href: '#/nebenkosten' }, 'Zur Nebenkostenabrechnung'));
  const r = nebenkosten(o.id, jahr);
  const flaecheGesamt = einheitenVon(o.id).reduce((s, e) => s + zahl(e.flaeche), 0);
  const konto = mietkonto(o.id);
  const frist = datumPlus(heute(), 30).split('-').reverse().join('.');
  const zeitraum = `01.01.${jahr} – 31.12.${jahr}`;
  const gesamtVon = (art: string, schluessel: string) => r.kostenarten.find((k) => k.art === art && k.schluessel === schluessel)?.summe ?? 0;

  const mappe = h('div', { class: 'din-mappe' });
  const druckeNur = (id?: string) => {
    if (id) mappe.dataset.druck = id; else delete mappe.dataset.druck;
    mappe.querySelectorAll<HTMLElement>('.nk-satz').forEach((s) => s.classList.toggle('nk-aktiv', s.dataset.id === id));
    window.addEventListener('afterprint', () => { delete mappe.dataset.druck; }, { once: true });
    window.print();
  };

  r.zeilen.forEach((z) => {
    const m = z.mieter, e = z.einheit;
    const an = [m.name, o.strasse || o.bezeichnung, o.ort];
    const nachzahlung = z.saldo > 0.004;
    const deckblatt = bogen(an, `Betriebskostenabrechnung ${jahr}`,
      briefInfo(['Objekt', o.bezeichnung], ['Einheit', e.bezeichnung], ['Zeitraum', zeitraum]),
      h('p', {}, 'Sehr geehrte Damen und Herren,'),
      h('p', {}, `anbei erhalten Sie die Abrechnung der Betriebskosten für ${e.bezeichnung} im Objekt ${o.bezeichnung} für den Zeitraum ${zeitraum}${z.monate < 12 ? ` (Ihr Nutzungszeitraum: ${z.monate} Monate)` : ''}.`),
      h('table', { class: 'vw-brief__tabelle nk-ergebnis' }, h('tbody', {},
        h('tr', {}, h('td', {}, 'Ihr Anteil an den Betriebskosten'), h('td', { class: 'vw-zahlspalte' }, geld(z.summe))),
        h('tr', {}, h('td', {}, 'abzüglich Ihrer Vorauszahlungen'), h('td', { class: 'vw-zahlspalte' }, geld(-z.voraus)))),
        h('tfoot', {}, h('tr', {}, h('th', {}, nachzahlung ? 'Nachzahlung' : 'Guthaben'), h('th', { class: 'vw-zahlspalte' }, geld(Math.abs(z.saldo)))))),
      nachzahlung
        ? h('p', {}, `Bitte überweisen Sie die Nachzahlung bis zum ${frist}${konto ? ` auf das Konto ${konto.iban}${konto.inhaber ? ` (${konto.inhaber})` : ''}` : ''} unter Angabe „Betriebskosten ${jahr}, ${e.bezeichnung}“.`)
        : h('p', {}, 'Das Guthaben erstatten wir Ihnen. Sollte sich Ihre Bankverbindung geändert haben, teilen Sie uns diese bitte mit.'),
      h('p', {}, 'Die Aufstellung der Kosten und ihre Verteilung finden Sie in der Anlage. Gern können Sie die Belege nach Absprache bei uns einsehen. Einwendungen gegen die Abrechnung teilen Sie uns bitte bis zum Ablauf des zwölften Monats nach Zugang mit (§ 556 Abs. 3 BGB).'),
      ...gruss(),
      h('p', { class: 'nk-anlage' }, 'Anlage: Aufstellung der Betriebskosten'));

    const anlage = h('section', { class: 'din-folge' },
      folgekopf(`Anlage zur Betriebskostenabrechnung ${jahr}`, `${m.name} · ${e.bezeichnung} · ${o.bezeichnung}`, 'Blatt 2'),
      h('h3', {}, 'Aufstellung der Kosten'),
      h('table', { class: 'vw-brief__tabelle' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Kostenart'), h('th', {}, 'Verteilerschlüssel'), h('th', { class: 'vw-zahlspalte' }, 'Kosten Objekt'), h('th', { class: 'vw-zahlspalte' }, 'Ihr Anteil'))),
        h('tbody', {}, z.posten.map((p) => h('tr', {}, h('td', {}, p.art), h('td', {}, p.schluessel), h('td', { class: 'vw-zahlspalte' }, geld(gesamtVon(p.art, p.schluessel))), h('td', { class: 'vw-zahlspalte' }, geld(p.betrag))))),
        h('tfoot', {},
          h('tr', {}, h('th', { colspan: 2 }, 'Summe'), h('th', { class: 'vw-zahlspalte' }, geld(r.gesamt)), h('th', { class: 'vw-zahlspalte' }, geld(z.summe))),
          h('tr', {}, h('td', { colspan: 3 }, 'abzüglich Vorauszahlungen'), h('td', { class: 'vw-zahlspalte' }, geld(-z.voraus))),
          h('tr', {}, h('th', { colspan: 3 }, nachzahlung ? 'Nachzahlung' : 'Guthaben'), h('th', { class: 'vw-zahlspalte' }, geld(Math.abs(z.saldo)))))),
      h('h3', {}, 'Ihre Verteilerschlüssel'),
      h('table', { class: 'vw-brief__tabelle' }, h('tbody', {},
        h('tr', {}, h('td', {}, 'Wohnfläche'), h('td', { class: 'vw-zahlspalte' }, `${String(zahl(e.flaeche)).replace('.', ',')} m² von ${String(flaecheGesamt).replace('.', ',')} m²`)),
        h('tr', {}, h('td', {}, 'Einheiten'), h('td', { class: 'vw-zahlspalte' }, `1 von ${einheitenVon(o.id).length}`)),
        h('tr', {}, h('td', {}, 'Personen im Haushalt'), h('td', { class: 'vw-zahlspalte' }, String(Math.max(1, zahl(m.personen))))),
        h('tr', {}, h('td', {}, 'Nutzungszeitraum'), h('td', { class: 'vw-zahlspalte' }, `${z.monate} von 12 Monaten`)),
        h('tr', {}, h('td', {}, 'Vorauszahlung monatlich'), h('td', { class: 'vw-zahlspalte' }, geld(zahl(m.nebenkosten)))))),
      h('p', { class: 'vw-brief__klein' }, 'Die Kosten werden nach dem jeweils angegebenen Schlüssel und anteilig nach Ihrem Nutzungszeitraum verteilt. Auf Leerstand entfallende Kosten trägt der Eigentümer.'),
      folgefuss());

    mappe.append(h('div', { class: 'nk-satz', 'data-id': m.id },
      h('div', { class: 'vw-reihe vw-nichtdrucken nk-satz__leiste' }, h('strong', {}, `${m.name} · ${e.bezeichnung}`), marke(nachzahlung ? `Nachzahlung ${geld(z.saldo)}` : `Guthaben ${geld(-z.saldo)}`), h('span', { class: 'vw-platz' }),
        h('button', { class: 'vw-knopf vw-knopf--klein', onclick: () => druckeNur(m.id) }, 'Nur diese drucken')),
      deckblatt, anlage));
  });

  return h('div', { class: 'vw-stapel' },
    h('div', { class: 'vw-reihe vw-nichtdrucken' },
      h('a', { class: 'vw-knopf', href: `#/nebenkosten/${o.id}` }, '← Zur Übersicht'),
      h('strong', {}, `${o.bezeichnung} · Betriebskosten ${jahr} · ${r.zeilen.length} Abrechnung${r.zeilen.length === 1 ? '' : 'en'}`),
      h('span', { class: 'vw-platz' }),
      h('button', { class: 'vw-knopf vw-knopf--voll', disabled: !r.zeilen.length, onclick: () => druckeNur() }, 'Alle drucken / PDF (DIN A4)'),
      h('p', { class: 'vw-fein', style: 'flex-basis:100%;margin:0' }, 'Je Mieter ein Deckblatt nach DIN 5008 (Fensterumschlag, E-Brief) und eine Anlage. Im Druckdialog: Skalierung 100 %, „Kopf- und Fußzeilen“ aus.')),
    !konto && h('p', { class: 'vw-warnung vw-nichtdrucken' }, 'Für dieses Objekt ist kein Mietkonto hinterlegt (Objekt → Finanzen). Bei Nachzahlungen fehlt sonst die Bankverbindung.'),
    h('p', { class: 'vw-warnung vw-nichtdrucken' }, 'Vorauszahlungen sind als Soll gerechnet. Bitte vor dem Versand mit den tatsächlichen Zahlungen abgleichen.'),
    r.zeilen.length ? mappe : h('p', { class: 'vw-leer' }, `Für ${jahr} gibt es keine Mietverhältnisse oder keine umlagefähigen Belege.`));
};

