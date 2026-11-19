/**
 * HEUTE ZU TUN · INDEXMIETE
 * ---------------------------------------------------------------
 *  • „Heute zu tun“: alles, was ansteht, über alle Objekte – sortiert nach
 *    überfällig / diese Woche / demnächst. Neben Fristen, Diensten, Aufgaben
 *    auch alles rund ums Mietverhältnis: Einzug, Kaution, Auszug,
 *    Kautionsabrechnung, Staffeln, Indexanpassung, Mieterhöhung, Nebenkostenfrist.
 *  • Indexmiete nach § 557b BGB: Berechnung aus dem Verbraucherpreisindex und
 *    Anpassungserklärung im Briefbogen.
 */
import { alle, finde, heute, speichere, type Satz } from './speicher';
import { ds, objektIdVon } from './ansicht';
import {
  aktivIm, datumPlus, datumPlusMonate, erhoehungspruefung, kautionBestand, kautionErhalten, mietStand, mieteAm,
  monatPlus, monatVon, staffelnVon, tageBis, verlaufVon, wirksamAb, zahl, MODERNISIERUNG,
} from './rechnen';
import { datum, geld, h, hinweis, kennzahl, marke, monatText, routen, weiterePunkte, wichtigFuer, zeichne, type Punkt } from './app';
import { bogen, briefInfo, gruss, werkzeug } from './ansichten2';
import { anredeZeile, anschriftMieter, offeneSchritte } from './ansichten10';

/* ---------- Indexmiete ---------- */
const prozent = (x: number) => `${x >= 0 ? '+' : '−'} ${Math.abs(x).toFixed(2).replace('.', ',')} %`;
const zahlText = (x: number) => String(x).replace('.', ',');

/** Grundlage der nächsten Indexanpassung: letzter Indexstand und seit wann die Miete unverändert ist */
export function indexStand(m: Satz) {
  const v = verlaufVon(m);
  const letzteIndex = [...v].reverse().find((x) => x.grund === 'Indexmiete' && x.indexWert);
  const basisMonat = letzteIndex?.indexMonat ?? m.indexBasisMonat;
  const basisWert = zahl(letzteIndex?.indexWert ?? m.indexBasisWert);
  const letzteAenderung = [m.beginn, ...v.filter((x) => x.grund !== MODERNISIERUNG).map((x) => x.ab)].filter(Boolean).sort().pop() as string;
  // Die Miete muss mindestens ein Jahr unverändert bleiben (§ 557b Abs. 2 BGB): Wirksamkeit frühestens 12 Monate nach der letzten Änderung
  const wirksamFrueh = letzteAenderung ? datumPlusMonate(letzteAenderung, 12) : heute();
  // Frühester Zugang, damit die Anpassung (Beginn des übernächsten Monats) nicht vor diesem Tag wirkt
  let zugangFrueh = heute();
  for (let i = 0; i < 400 && wirksamAb(zugangFrueh) < wirksamFrueh; i++) zugangFrueh = datumPlus(zugangFrueh, 1);
  return { basisMonat, basisWert, letzteAenderung, wirksamFrueh, zugangFrueh };
}
/** Anpassungserklärung erst ab dem übernächsten Monat wirksam (§ 557b Abs. 3 BGB) */
const indexWirksam = (zugang: string) => `${monatPlus(monatVon(zugang), 2)}-01`;

let indexEingabe: { monat: string; wert: string; zugang: string } = { monat: '', wert: '', zugang: '' };
routen.indexmiete = (id) => {
  const m = finde('mieter', id);
  const einheit = m && finde('einheiten', m.einheitId);
  const objekt = einheit && finde('objekte', einheit.objektId);
  if (!m || !einheit || !objekt) return h('p', { class: 'vw-leer' }, 'Dieses Mietverhältnis gibt es nicht mehr.');
  const st = indexStand(m);
  if (!indexEingabe.zugang || indexEingabe.zugang < heute()) indexEingabe.zugang = st.zugangFrueh > heute() ? st.zugangFrueh : heute();
  const wert = zahl(String(indexEingabe.wert).replace(',', '.'));
  const zugang = indexEingabe.zugang;
  const wirksam = indexWirksam(zugang);
  const alt = mieteAm(m, wirksam > heute() ? datumPlus(wirksam, -1) : heute());
  const neu = st.basisWert && wert ? Math.round(alt * (wert / st.basisWert) * 100) / 100 : 0;
  const veraenderung = st.basisWert && wert ? (wert / st.basisWert - 1) * 100 : 0;
  const warnungen = [
    m.mietart !== 'Indexmiete' && 'Für dieses Mietverhältnis ist keine Indexmiete vereinbart.',
    !st.basisWert && 'Der Basis-Indexwert fehlt (Mietverhältnis bearbeiten → Indexmiete).',
    wirksam < st.wirksamFrueh && `Die Miete muss mindestens ein Jahr unverändert bleiben. Frühestens wirksam ab ${datum(st.wirksamFrueh)} – dafür muss die Erklärung bis spätestens zum Ende des Monats vor dem Vormonat zugehen (frühester Zugang: ${datum(st.zugangFrueh)}).`,
    indexEingabe.monat && st.basisMonat && indexEingabe.monat <= st.basisMonat && 'Der neue Indexmonat liegt nicht nach dem Basismonat.',
  ].filter(Boolean) as string[];
  const feld = (label: string, input: HTMLElement, hilfe?: string) => h('div', { class: 'feld' }, h('label', {}, label, input), hilfe && h('small', {}, hilfe));
  const setze = (k: keyof typeof indexEingabe) => (e: Event) => { indexEingabe[k] = (e.target as HTMLInputElement).value; zeichne(); };
  const fertig = neu > 0 && !warnungen.length;
  return h('div', { class: 'vw-stapel' },
    werkzeug(`#/mietverhaeltnis/${m.id}`,
      h('button', { class: 'vw-knopf', disabled: !fertig, onclick: () => {
        if (!confirm(`Anpassung als versandt erfassen? Ab ${datum(wirksam)} gilt eine Kaltmiete von ${geld(neu)}.`)) return;
        speichere('mietaenderungen', { mieterId: m.id, ab: wirksam, alt, kaltmiete: neu, grund: 'Indexmiete', notiz: `VPI ${monatText(indexEingabe.monat)}: ${zahlText(wert)} (Basis ${st.basisMonat ? monatText(st.basisMonat) : ''}: ${zahlText(st.basisWert)}); Zugang ${datum(zugang)}`, indexMonat: indexEingabe.monat, indexWert: wert });
        indexEingabe = { monat: '', wert: '', zugang: '' };
        hinweis('Indexanpassung erfasst – sie gilt automatisch ab dem Wirksamkeitstag');
        location.hash = `#/mietverhaeltnis/${m.id}`;
      } }, 'Als versandt erfassen')),
    h('section', { class: 'vw-karte vw-nichtdrucken' }, h('div', { class: 'vw-innen' },
      h('h1', {}, 'Indexanpassung'),
      h('p', { class: 'vw-fein' }, `Basis: ${st.basisMonat ? monatText(st.basisMonat) : 'Monat fehlt'} · Indexwert ${st.basisWert ? zahlText(st.basisWert) : '–'} · Miete unverändert seit ${datum(st.letzteAenderung)}. Den aktuellen Verbraucherpreisindex (VPI, 2020 = 100) veröffentlicht das Statistische Bundesamt monatlich (destatis.de).`),
      h('div', { class: 'vw-form__felder' },
        feld('Aktueller Indexmonat', h('input', { type: 'month', value: indexEingabe.monat, onchange: setze('monat') })),
        feld('Indexwert in diesem Monat', h('input', { type: 'text', inputmode: 'decimal', value: indexEingabe.wert, placeholder: 'z. B. 125,8', onchange: setze('wert') })),
        feld('Zugang beim Mieter', h('input', { type: 'date', value: zugang, onchange: setze('zugang') }), `Wirksam ab ${datum(wirksam)} (Beginn des übernächsten Monats)`)),
      neu > 0 && h('p', {}, `Veränderung des Index: ${prozent(veraenderung)} · Kaltmiete ${geld(alt)} → `, h('strong', {}, geld(neu)), ` (${neu >= alt ? '+' : '−'} ${geld(Math.abs(neu - alt))} im Monat)`),
      neu > 0 && neu < alt && h('p', { class: 'vw-hinweisbox' }, 'Der Index ist gesunken. Auch eine Senkung kann der Mieter verlangen; Sie können die Erklärung ebenso abgeben.'))),
    ...warnungen.map((w) => h('p', { class: 'vw-warnung vw-nichtdrucken' }, w)),
    neu > 0 && bogen(anschriftMieter({ m, einheit, objekt }), `Anpassung der Miete nach § 557b BGB (Indexmiete)`,
      briefInfo(['Objekt', objekt.bezeichnung], ['Einheit', einheit.bezeichnung]),
      h('p', {}, anredeZeile(m)),
      h('p', {}, `in Ihrem Mietvertrag ist vereinbart, dass sich die Grundmiete nach dem vom Statistischen Bundesamt ermittelten Verbraucherpreisindex für Deutschland (VPI, 2020 = 100) richtet. Der Index hat sich wie folgt verändert:`),
      h('table', { class: 'vw-brief__tabelle' }, h('tbody', {},
        h('tr', {}, h('td', {}, `Index ${st.basisMonat ? monatText(st.basisMonat) : ''} (letzte Festsetzung)`), h('td', { class: 'vw-zahlspalte' }, zahlText(st.basisWert))),
        h('tr', {}, h('td', {}, `Index ${monatText(indexEingabe.monat)}`), h('td', { class: 'vw-zahlspalte' }, zahlText(wert))),
        h('tr', {}, h('td', {}, 'Veränderung'), h('td', { class: 'vw-zahlspalte' }, prozent(veraenderung))),
        h('tr', {}, h('td', {}, 'Bisherige Grundmiete'), h('td', { class: 'vw-zahlspalte' }, geld(alt))),
        h('tr', {}, h('td', {}, `Neue Grundmiete (${geld(alt)} × ${zahlText(wert)} ÷ ${zahlText(st.basisWert)})`), h('td', { class: 'vw-zahlspalte' }, geld(neu))),
        h('tr', { class: 'vw-summe' }, h('td', {}, h('strong', {}, neu >= alt ? 'Erhöhung im Monat' : 'Senkung im Monat')), h('td', { class: 'vw-zahlspalte' }, h('strong', {}, geld(Math.abs(neu - alt))))))),
      h('p', {}, `Die geänderte Grundmiete ist ab dem `, h('strong', {}, datum(wirksam)), ` zu zahlen. Die Vorauszahlung auf die Betriebskosten bleibt unverändert (${geld(m.nebenkosten)}); Ihre monatliche Gesamtmiete beträgt damit ${geld(neu + zahl(m.nebenkosten))}.`),
      h('p', {}, 'Bitte passen Sie Ihren Dauerauftrag zu diesem Termin an. Bei Fragen sprechen Sie uns gern an.'),
      ...gruss()));
};

/* ---------- Was steht an? Mietverhältnisse und Objekte ---------- */
function mietPunkte(objektId?: string): Punkt[] {
  const mieter = (objektId ? alle('mieter').filter((x) => objektIdVon('mieter', x) === objektId) : ds('mieter'));
  const h0 = heute();
  const aus: Punkt[] = [];
  const mit = (t: string, m: Satz) => (objektId ? t : `${t} · ${finde('objekte', objektIdVon('mieter', m))?.bezeichnung ?? ''}`);
  const akte = (m: Satz) => `#/mietverhaeltnis/${m.id}`;
  for (const m of mieter) {
    const st = mietStand(m);
    // Einzug
    if (st === 'Geplant' && tageBis(m.beginn) <= 21 || (st === 'Laufend' && tageBis(m.beginn) >= -60)) {
      const offen = offeneSchritte(m, false);
      if (offen.length) aus.push({ datum: m.beginn, text: mit(`Einzug ${m.name}: ${offen.length} Schritt${offen.length > 1 ? 'e' : ''} offen (${offen[0]})`, m), art: 'Einzug', farbe: st === 'Laufend' && tageBis(m.beginn) < -14 ? 'rot' : 'blau', ziel: akte(m) });
    }
    // Kaution: fällige Raten (§ 551 Abs. 2: zu Beginn und mit den zwei folgenden Mieten)
    const kSoll = zahl(m.kautionSoll);
    if (kSoll > 0 && m.kautionArt !== 'Keine Kaution' && (st === 'Laufend' || st === 'Gekündigt' || st === 'Geplant')) {
      const raten = [0, 1, 2].map((i) => datumPlusMonate(m.beginn, i)).filter((d) => d <= h0).length;
      const faellig = Math.round(kSoll * raten / 3 * 100) / 100;
      const offen = Math.round((faellig - kautionErhalten(m)) * 100) / 100;
      if (raten > 0 && offen > 0.01) aus.push({ datum: datumPlusMonate(m.beginn, Math.max(0, raten - 1)), text: mit(`Kaution ${m.name}: ${geld(offen)} fällig`, m), art: 'Kaution', farbe: raten >= 2 ? 'rot' : 'gelb', ziel: akte(m) });
    }
    // Auszug
    if (st === 'Gekündigt' && tageBis(m.ende) <= 45) {
      const offen = offeneSchritte(m, true).filter((t) => !/Kaution/.test(t));
      if (offen.length) aus.push({ datum: m.ende, text: mit(`Auszug ${m.name}: ${offen[0]}${offen.length > 1 ? ` (+${offen.length - 1})` : ''}`, m), art: 'Auszug', farbe: tageBis(m.ende) <= 7 ? 'rot' : 'gelb', ziel: akte(m) });
    }
    if (st === 'Beendet' && kautionBestand(m) > 0.005) aus.push({ datum: m.ende, text: mit(`Kaution abrechnen: ${m.name} (${geld(kautionBestand(m))} verwahrt)`, m), art: 'Kaution', farbe: tageBis(m.ende) < -120 ? 'rot' : 'gelb', ziel: `#/kautionsbrief/${m.id}/abrechnung` });
    if (st !== 'Laufend' && st !== 'Gekündigt') continue;
    // Staffel tritt bald in Kraft
    const staffel = staffelnVon(m).find((x) => x.ab > h0 && tageBis(x.ab) <= 45);
    if (staffel) aus.push({ datum: staffel.ab, text: mit(`Staffel ${m.name}: ${geld(staffel.kaltmiete)} ab ${datum(staffel.ab)} – Mieter erinnern`, m), art: 'Staffel', farbe: 'blau', ziel: akte(m) });
    // Indexanpassung möglich
    if (m.mietart === 'Indexmiete' && st === 'Laufend') {
      const ix = indexStand(m);
      if (ix.basisWert && tageBis(ix.zugangFrueh) <= 30) aus.push({ datum: ix.zugangFrueh, text: mit(`Indexanpassung möglich: ${m.name}`, m), art: 'Miete', farbe: 'blau', ziel: `#/indexmiete/${m.id}` });
    }
    // Mieterhöhung § 558 möglich
    if ((!m.mietart || m.mietart === 'Normale Miete') && st === 'Laufend' && !alle('mieterhoehungen').some((x) => x.mieterId === m.id && (x.status === 'Versandt' || x.status === 'Entwurf'))
      && !alle('mietaenderungen').some((x) => x.mieterId === m.id && x.ab > h0)) {
      const p = erhoehungspruefung(m, h0);
      if (!p.keineEinheitsdaten && p.erhoehung > 0.5 && tageBis(p.frueh) <= 30) aus.push({ datum: p.frueh > h0 ? p.frueh : h0, text: mit(`Mieterhöhung möglich: ${m.name} (+ ${geld(p.erhoehung)} im Monat)`, m), art: 'Miete', farbe: 'blau', ziel: '#/mieterhoehung' });
    }
  }
  // Nebenkostenabrechnung: Zugang bis 31.12. des Folgejahres (§ 556 Abs. 3 BGB)
  const jahr = Number(h0.slice(0, 4)) - 1;
  const objekte = objektId ? [finde('objekte', objektId)].filter(Boolean) as Satz[] : ds('objekte');
  for (const o of objekte) {
    if ((o.nkVersandt ?? {})[jahr]) continue;
    const hatte = alle('mieter').some((m) => objektIdVon('mieter', m) === o.id && Array.from({ length: 12 }, (_, i) => `${jahr}-${String(i + 1).padStart(2, '0')}`).some((mo) => aktivIm(m, mo)));
    const frist = `${jahr + 1}-12-31`;
    if (hatte && tageBis(frist) <= 150) aus.push({ datum: frist, text: objektId ? `Betriebskostenabrechnung ${jahr} versenden` : `Betriebskostenabrechnung ${jahr} versenden · ${o.bezeichnung}`, art: 'Nebenkosten', farbe: tageBis(frist) <= 45 ? 'rot' : 'gelb', ziel: `#/nkbriefe/${o.id}/${jahr}` });
  }
  return aus;
}
weiterePunkte.push(mietPunkte);

/* ---------- Seite „Heute zu tun“ ---------- */
routen.heute = () => {
  const h0 = heute();
  const alle_ = wichtigFuer().concat(
    // Was in den nächsten 60 Tagen kommt (über „Jetzt wichtig“ hinaus)
    ds('fristen').filter((x) => !x.erledigt && tageBis(x.faellig) > 30 && tageBis(x.faellig) <= 60).map((x) => ({ datum: x.faellig, text: `${x.art} · ${finde('objekte', x.objektId)?.bezeichnung ?? ''}`, art: 'Frist', farbe: 'grau', ziel: '#/liste/fristen' })),
  );
  const gruppen: [string, Punkt[], string][] = [
    ['Überfällig', alle_.filter((p) => p.datum < h0), 'Bitte zuerst erledigen.'],
    ['Heute', alle_.filter((p) => p.datum === h0), ''],
    ['Diese Woche', alle_.filter((p) => p.datum > h0 && p.datum <= datumPlus(h0, 7)), ''],
    ['Demnächst', alle_.filter((p) => p.datum > datumPlus(h0, 7)), 'Vorbereiten, damit nichts eng wird.'],
  ];
  const zaehle = (art: string) => alle_.filter((p) => p.art === art).length;
  return h('div', { class: 'vw-stapel' },
    h('header', { class: 'vw-seitenkopf' }, h('h1', {}, 'Heute zu tun'),
      h('p', {}, new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }), ' · Fristen, Dienste, Aufgaben und alles rund um Ihre Mietverhältnisse – automatisch zusammengestellt.')),
    h('div', { class: 'vw-kennzahlen' },
      kennzahl(String(gruppen[0][1].length), 'überfällig', undefined, gruppen[0][1].length ? 'vw-kennzahl--rot' : ''),
      kennzahl(String(gruppen[1][1].length + gruppen[2][1].length), 'heute und diese Woche', undefined, 'vw-kennzahl--blau'),
      kennzahl(String(zaehle('Einzug') + zaehle('Auszug')), 'Ein- und Auszüge in Arbeit'),
      kennzahl(String(zaehle('Miete')), 'Mietanpassungen möglich', '#/mieterhoehung')),
    ...gruppen.filter(([, p]) => p.length).map(([titel, punkte, hilfe]) => h('section', { class: 'vw-karte' },
      h('header', { class: 'vw-karte__kopf' }, h('h2', {}, titel, ' ', h('span', { class: 'vw-zahl' }, String(punkte.length))), hilfe && h('span', {}, hilfe)),
      h('ul', { class: 'vw-punkte' }, punkte.sort((a, b) => a.datum.localeCompare(b.datum)).map((p) => h('li', {},
        h('a', { href: p.ziel }, marke(p.art, p.farbe), h('span', { class: 'vw-punkte__text' }, p.text), h('span', { class: 'vw-punkte__datum' }, datum(p.datum)))))))),
    !alle_.length && h('p', { class: 'vw-leer' }, 'Nichts zu tun. Alles ist im Plan.'));
};
