/**
 * MIETERHÖHUNG nach § 558 BGB (Anpassung an die ortsübliche Vergleichsmiete)
 * ---------------------------------------------------------------
 * Übersicht: Für jedes laufende Mietverhältnis wird geprüft,
 *   – ob die Sperrfrist abgelaufen ist (12 Monate bis zum Verlangen,
 *     15 Monate bis zur Wirksamkeit seit der letzten Änderung),
 *   – wie hoch die Kappungsgrenze liegt (20 %, im angespannten Markt
 *     15 % in drei Jahren) und
 *   – wie hoch die ortsübliche Vergleichsmiete ist.
 * Daraus ergibt sich die mögliche neue Miete.
 *
 * Annahmen und Grenzen (bitte rechtlich prüfen lassen):
 *   – Ohne erfasste Mietänderungen gilt die Miete als unverändert seit Mietbeginn.
 *   – Erhöhungen nach § 559 (Modernisierung) werden bei der Sperrfrist ignoriert
 *     und bei der Kappungsgrenze herausgerechnet.
 *   – Staffel- und Indexmieten sind ausgeschlossen.
 *   – Das Tool prüft nicht, ob die Begründung (Mietspiegel-Feld, Gutachten,
 *     Vergleichswohnungen) inhaltlich trägt.
 */
import { alle, finde, heute, speichere, type Satz } from './speicher';
import { ds } from './ansicht';
import { ARTEN } from './schema';
import { erhoehungspruefung, wirksamAb, zahl, zustimmungBis } from './rechnen';
import { datum, formular, geld, h, hinweis, kennzahl, marke, routen, zeichne } from './app';
import { bogen, gruss, werkzeug } from './ansichten2';

const prozent = (x: number) => `${x.toFixed(1).replace('.', ',')} %`;
const proQm = (betrag: number, flaeche: number) => (flaeche ? `${geld(betrag / flaeche)}/m²` : '–');

type Stand = { text: string; farbe: string; moeglich: boolean };

function pruefeZeile(m: Satz) {
  const laeuft = alle('mieterhoehungen').find((x) => x.mieterId === m.id && x.status === 'Versandt');
  const erste = erhoehungspruefung(m, heute());
  const zugang = erste.frueh > heute() ? erste.frueh : heute();
  const p = erste.frueh > heute() ? erhoehungspruefung(m, zugang) : erste;
  let stand: Stand;
  const vereinbart = alle('mietaenderungen').filter((x) => x.mieterId === m.id && x.ab > heute()).sort((a, b) => a.ab.localeCompare(b.ab))[0];
  if (vereinbart) stand = { text: `Erhöhung vereinbart ab ${datum(vereinbart.ab)}`, farbe: 'gruen', moeglich: false };
  else if (m.mietart === 'Indexmiete') stand = { text: 'Indexmiete – Anpassung über den Index', farbe: 'grau', moeglich: false };
  else if (m.mietart && m.mietart !== 'Normale Miete') stand = { text: `Nicht möglich: ${m.mietart}`, farbe: 'grau', moeglich: false };
  else if (laeuft) stand = { text: 'Verlangen läuft', farbe: 'blau', moeglich: false };
  else if (p.keineEinheitsdaten) stand = { text: 'Fläche oder Vergleichsmiete fehlt', farbe: 'gelb', moeglich: false };
  else if (p.erhoehung <= 0.005) stand = { text: p.aktuell >= p.vergleich ? 'Miete liegt bereits auf Vergleichsniveau' : 'Kappungsgrenze erreicht', farbe: 'grau', moeglich: false };
  else if (erste.frueh > heute()) stand = { text: `Möglich ab ${datum(erste.frueh)}`, farbe: 'gelb', moeglich: false };
  else stand = { text: 'Jetzt möglich', farbe: 'gruen', moeglich: true };
  return { m, p, zugang, stand };
}

routen.mieterhoehung = () => {
  const zeilen = ds('mieter').filter((m) => m.beginn && !m.ende).map(pruefeZeile);
  const jetzt = zeilen.filter((z) => z.stand.moeglich);
  const spaeter = zeilen.filter((z) => !z.stand.moeglich && z.p.erhoehung > 0.005 && z.stand.farbe === 'gelb' && !z.p.keineEinheitsdaten);
  const jahr = (liste: typeof zeilen) => liste.reduce((s, z) => s + z.p.erhoehung * 12, 0);
  const vorbereiten = (z: ReturnType<typeof pruefeZeile>) => {
    formular('mieterhoehungen', {
      mieterId: z.m.id, zugang: z.zugang, neueMiete: z.p.ziel, begruendung: 'Mietspiegel', quelle: z.p.objekt?.mietspiegel ?? '', status: 'Entwurf',
    }, (s) => (location.hash = `#/erhoehung/${s.id}`));
  };
  return h('div', { class: 'vw-stapel' },
    h('header', { class: 'vw-seitenkopf' }, h('h1', {}, 'Mieterhöhung'),
      h('p', {}, 'Prüft für jedes laufende Mietverhältnis, ob und wie weit die Miete nach § 558 BGB an die ortsübliche Vergleichsmiete angepasst werden kann – mit Sperrfrist und Kappungsgrenze.')),
    h('div', { class: 'vw-kennzahlen' },
      kennzahl(String(jetzt.length), 'Erhöhungen jetzt möglich', undefined, jetzt.length ? 'vw-kennzahl--blau' : ''),
      kennzahl(geld(jahr(jetzt)), 'Mehrertrag pro Jahr (jetzt möglich)'),
      kennzahl(String(spaeter.length), 'bald möglich'),
      kennzahl(geld(jahr(spaeter)), 'Mehrertrag pro Jahr (bald möglich)')),
    h('p', { class: 'vw-fein' }, 'Voraussetzung sind Wohnfläche und ortsübliche Vergleichsmiete je Einheit (unter „Einheiten“) sowie frühere Mietänderungen unter „Mietverlauf“. Ohne erfasste Änderungen gilt die Miete als unverändert seit Mietbeginn.'),
    h('section', { class: 'vw-karte' }, h('div', { class: 'vw-tabelle' }, h('table', {},
      h('thead', {}, h('tr', {}, ['Mietverhältnis', 'Miete heute', 'Letzte Änderung', 'Vergleichsmiete', 'Kappung bis', 'Mögliche Miete', 'Stand', ''].map((t) => h('th', { scope: 'col' }, t)))),
      h('tbody', {}, zeilen.length ? zeilen.map((z) => h('tr', {},
        h('td', { 'data-spalte': 'Mietverhältnis' }, h('strong', {}, z.m.name), h('small', { class: 'vw-block' }, ARTEN.einheiten.anzeige(z.p.einheit ?? ({} as Satz)))),
        h('td', { 'data-spalte': 'Miete heute', class: 'vw-zahlspalte' }, geld(z.p.aktuell), h('small', { class: 'vw-block' }, proQm(z.p.aktuell, z.p.flaeche))),
        h('td', { 'data-spalte': 'Letzte Änderung' }, datum(z.p.letzte)),
        h('td', { 'data-spalte': 'Vergleichsmiete', class: 'vw-zahlspalte' }, z.p.vergleich ? geld(z.p.vergleich) : '–', z.p.vm > 0 && h('small', { class: 'vw-block' }, `${geld(z.p.vm)}/m²`)),
        h('td', { 'data-spalte': 'Kappung bis', class: 'vw-zahlspalte' }, geld(z.p.kappung), h('small', { class: 'vw-block' }, `${prozent(z.p.satz * 100)} in 3 Jahren`)),
        h('td', { 'data-spalte': 'Mögliche Miete', class: 'vw-zahlspalte' }, z.p.erhoehung > 0.005 ? [h('strong', {}, geld(z.p.ziel)), h('small', { class: 'vw-block' }, `+ ${geld(z.p.erhoehung * 12)} pro Jahr`)] : '–'),
        h('td', { 'data-spalte': 'Stand' }, marke(z.stand.text, z.stand.farbe)),
        h('td', { class: 'vw-aktion' }, z.m.mietart === 'Indexmiete' && h('a', { class: 'vw-knopf vw-knopf--klein', href: `#/indexmiete/${z.m.id}` }, 'Indexanpassung'), (z.stand.moeglich || (z.stand.farbe === 'gelb' && !z.p.keineEinheitsdaten && z.stand.text.startsWith('Möglich ab'))) && h('button', { class: 'vw-knopf vw-knopf--klein', onclick: () => vorbereiten(z) }, 'Vorbereiten'))))
        : [h('tr', {}, h('td', { colspan: 8, class: 'vw-leer' }, 'Es gibt keine laufenden Mietverhältnisse.'))])))),
    h('div', { class: 'vw-reihe' },
      h('a', { class: 'vw-knopf', href: '#/liste/mietaenderungen' }, 'Mietverlauf erfassen'),
      h('a', { class: 'vw-knopf', href: '#/liste/mieterhoehungen' }, 'Alle Mieterhöhungen'),
      h('a', { class: 'vw-knopf', href: '#/liste/einheiten' }, 'Einheiten (Fläche, Vergleichsmiete)')));
};

routen.erhoehung = (id) => {
  const v = finde('mieterhoehungen', id);
  const m = v && finde('mieter', v.mieterId);
  if (!v || !m) return h('p', { class: 'vw-leer' }, 'Diese Mieterhöhung gibt es nicht mehr. ', h('a', { href: '#/mieterhoehung' }, 'Zur Übersicht'));
  const p = erhoehungspruefung(m, v.zugang);
  const objekt = p.objekt;
  const neu = zahl(v.neueMiete);
  const gebucht = alle('mietaenderungen').filter((x) => x.mieterId === m.id && x.grund === '§ 558 Vergleichsmiete' && zahl(x.kaltmiete) === zahl(v.neueMiete)).pop();
  const alt = v.status === 'Zugestimmt' && gebucht ? zahl(gebucht.alt) : p.aktuell;
  const zuschlag = neu - alt;
  const wirksam = wirksamAb(v.zugang);
  const frist = zustimmungBis(v.zugang);
  const warnungen = [
    m.mietart && m.mietart !== 'Normale Miete' && `Bei einer ${m.mietart} ist eine Erhöhung nach § 558 ausgeschlossen.`,
    !p.sperreOk && `Sperrfrist: Das Verlangen darf frühestens am ${datum(p.frueh)} zugehen (letzte Änderung ${datum(p.letzte)}).`,
    neu > p.kappung + 0.005 && `Die neue Miete übersteigt die Kappungsgrenze von ${geld(p.kappung)} (${prozent(p.satz * 100)} in drei Jahren).`,
    p.vergleich > 0 && neu > p.vergleich + 0.005 && `Die neue Miete liegt über der ortsüblichen Vergleichsmiete von ${geld(p.vergleich)}.`,
    !String(v.quelle ?? '').trim() && 'Die Fundstelle der Begründung fehlt. Ohne sie ist das Verlangen unwirksam (§ 558a BGB).',
    zuschlag <= 0 && 'Die neue Miete ist nicht höher als die aktuelle.',
  ].filter(Boolean) as string[];
  const an = [m.name, objekt?.strasse || objekt?.bezeichnung, objekt?.ort];
  const begruendung = {
    Mietspiegel: `Die ortsübliche Vergleichsmiete für Ihre Wohnung beträgt nach ${v.quelle || 'dem Mietspiegel'}${p.vm ? ` ${geld(p.vm)} je m² Wohnfläche. Bei ${String(p.flaeche).replace('.', ',')} m² ergibt das ${geld(p.vergleich)}` : ''}.`,
    Mietdatenbank: `Die ortsübliche Vergleichsmiete ergibt sich aus der Mietdatenbank: ${v.quelle}.`,
    Gutachten: `Die ortsübliche Vergleichsmiete ergibt sich aus dem beigefügten Sachverständigengutachten: ${v.quelle}.`,
    Vergleichswohnungen: `Zur Begründung nennen wir folgende Vergleichswohnungen: ${v.quelle}.`,
  }[v.begruendung as string] ?? v.quelle;

  const zustimmen = () => {
    if (!confirm(`Zustimmung von ${m.name} zur neuen Kaltmiete von ${geld(neu)} ab ${datum(wirksam)} verbuchen?\n\nDie Mietänderung wird im Mietverlauf eingetragen.`)) return;
    speichere('mietaenderungen', { mieterId: m.id, ab: wirksam, alt, kaltmiete: neu, grund: '§ 558 Vergleichsmiete', notiz: `Zustimmung am ${datum(heute())}` });
    speichere('mieter', { id: m.id, kaltmiete: neu });
    speichere('mieterhoehungen', { id: v.id, status: 'Zugestimmt' });
    hinweis('Zustimmung gebucht – die neue Miete gilt ab dem genannten Datum');
  };
  return h('div', { class: 'vw-stapel' },
    werkzeug('#/mieterhoehung',
      marke(v.status),
      h('button', { class: 'vw-knopf', onclick: () => formular('mieterhoehungen', v) }, 'Bearbeiten'),
      v.status === 'Entwurf' && h('button', { class: 'vw-knopf', onclick: () => { speichere('mieterhoehungen', { id: v.id, status: 'Versandt' }); hinweis('Als versandt markiert'); } }, 'Als versandt markieren'),
      v.status === 'Versandt' && h('button', { class: 'vw-knopf vw-knopf--voll', onclick: zustimmen }, 'Zustimmung eingegangen'),
      v.status === 'Versandt' && h('button', { class: 'vw-knopf', onclick: () => { speichere('mieterhoehungen', { id: v.id, status: 'Abgelehnt' }); hinweis('Als abgelehnt vermerkt'); } }, 'Abgelehnt'),
      v.status === 'Abgelehnt' && h('span', { class: 'vw-fein' }, 'Bei Ablehnung kann auf Zustimmung geklagt werden (Frist: drei weitere Monate nach Ablauf der Zustimmungsfrist). Das Tool begleitet das nicht.')),
    warnungen.length > 0 && h('div', { class: 'vw-warnung vw-nichtdrucken' }, h('strong', {}, 'Bitte beachten:'), h('ul', {}, warnungen.map((w) => h('li', {}, w)))),
    h('p', { class: 'vw-warnung vw-nichtdrucken' }, 'Vorlage: Bitte lassen Sie Begründung, Fristen und Zustellung rechtlich prüfen, bevor Sie das Schreiben versenden.'),
    bogen(an, 'Mieterhöhungsverlangen gemäß § 558 BGB',
      h('p', {}, `Mietverhältnis ${objekt?.bezeichnung ?? ''}${p.einheit ? `, ${p.einheit.bezeichnung}` : ''}`),
      h('p', {}, 'Sehr geehrte Damen und Herren,'),
      h('p', {}, `Ihre Kaltmiete beträgt derzeit ${geld(alt)} und ist seit dem ${datum(p.letzte)} unverändert.`),
      h('p', {}, `Wir bitten Sie, einer Erhöhung der monatlichen Kaltmiete auf ${geld(neu)} zuzustimmen. Die Erhöhung beträgt ${geld(zuschlag)} (${prozent(alt ? (zuschlag / alt) * 100 : 0)}).`),
      h('h3', {}, 'Begründung'),
      h('p', {}, begruendung),
      h('p', {}, `Die Kappungsgrenze (${prozent(p.satz * 100)} innerhalb von drei Jahren) wird eingehalten: Die Kaltmiete vor drei Jahren betrug ${geld(p.basis)}, die neue Miete liegt damit innerhalb von ${geld(p.kappung)}.`),
      h('h3', {}, 'Ihre neue Miete'),
      h('table', { class: 'vw-brief__tabelle' }, h('tbody', {},
        h('tr', {}, h('td', {}, 'Neue Kaltmiete'), h('td', { class: 'vw-zahlspalte' }, geld(neu))),
        h('tr', {}, h('td', {}, 'Nebenkosten-Vorauszahlung (unverändert)'), h('td', { class: 'vw-zahlspalte' }, geld(m.nebenkosten))),
        h('tr', {}, h('th', {}, 'Gesamtmiete ab ' + datum(wirksam)), h('th', { class: 'vw-zahlspalte' }, geld(neu + zahl(m.nebenkosten)))))),
      h('p', {}, `Wir bitten Sie, der Erhöhung bis zum ${datum(frist)} zuzustimmen. Stimmen Sie zu, schulden Sie die erhöhte Miete ab dem ${datum(wirksam)}.`),
      h('p', {}, 'Bitte senden Sie uns dazu den unterschriebenen Abschnitt zurück.'),
      ...gruss(),
      h('div', { class: 'vw-brief__abschnitt' },
        h('p', {}, h('strong', {}, `Zustimmung zur Mieterhöhung – ${objekt?.bezeichnung ?? ''}${p.einheit ? `, ${p.einheit.bezeichnung}` : ''}`)),
        h('p', {}, `Ich stimme der Erhöhung der Kaltmiete auf ${geld(neu)} ab dem ${datum(wirksam)} zu.`),
        h('div', { class: 'vw-brief__sign' }, h('span', {}, 'Ort, Datum'), h('span', {}, 'Unterschrift Mieter')))));
};
