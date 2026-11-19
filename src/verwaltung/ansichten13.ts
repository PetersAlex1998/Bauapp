/**
 * EINZUGSUNTERLAGEN – alles, was zum Mietvertrag gehört
 * ---------------------------------------------------------------
 *  • Einzugsformular: Daten des Haushalts, Bankverbindung, Zahlweise, Klingelschild,
 *    Einwilligung E-Mail, Hinweise zum Einzug – am Bildschirm ausfüllen oder leer drucken
 *  • Hausordnung (Vorlage unter Administration → Unternehmen, je Haus ergänzbar)
 *    mit Unterschrift des Mieters
 *  • Datenschutzinformation für Mieter (Art. 13 DSGVO)
 *  • SEPA-Lastschriftmandat (wenn per Lastschrift gezahlt wird)
 *  • Willkommensschreiben mit Ansprechpartner, Zahlung, Schadensmeldung, Erledigungen
 *  • Vertragsmappe: alle Unterlagen in einem Druck, jedes im Briefbogen
 */
import { alle, finde, heute, speichere, type Satz } from './speicher';
import { mieteAm, zahl } from './rechnen';
import { datum, geld, h, hinweis, routen, zeichne } from './app';
import { absender, bogen, briefInfo, gruss, mietkonto, werkzeug } from './ansichten2';
import { anredeZeile, anschriftMieter, personen, wohnungText } from './ansichten10';

type Kontext = { m: Satz; einheit: Satz; objekt: Satz; kunde?: Satz };
function kontext(id?: string): Kontext | null {
  const m = finde('mieter', id);
  const einheit = m && finde('einheiten', m.einheitId);
  const objekt = einheit && finde('objekte', einheit.objektId);
  return m && einheit && objekt ? { m, einheit, objekt, kunde: finde('kunden', objekt.kundeId) } : null;
}
const fehlt = () => h('p', { class: 'vw-leer' }, 'Dieses Mietverhältnis gibt es nicht mehr. ', h('a', { href: '#/mieten' }, 'Zu den Mieten'));
const anschrift = (o: Satz) => [o.strasse, o.ort].filter(Boolean).join(', ') || o.bezeichnung;
const kasten = (an: boolean) => (an ? '☒' : '☐');
const linie = (wert?: string) => (wert ? h('span', {}, wert) : h('span', { class: 'din__ausfuellen' }));
const unterschriften = (...wer: string[]) => h('div', { class: 'vw-brief__sign din__sign' }, wer.flatMap((w) => [h('span', {}, 'Ort, Datum'), h('span', {}, w)]));

/* ---------- Hausordnung ---------- */
export const HAUSORDNUNG_STANDARD = `# Rücksicht und Ruhe
Die Hausgemeinschaft lebt von gegenseitiger Rücksicht. Vermeiden Sie störenden Lärm – insbesondere in der Nachtruhe von 22:00 bis 6:00 Uhr. Musik, Fernseher und Geräte bitte auf Zimmerlautstärke.
Handwerkliche Arbeiten in der Wohnung möglichst werktags zwischen 8:00 und 20:00 Uhr. Feiern kündigen Sie am besten vorher bei den Nachbarn an.

# Sicherheit und Brandschutz
Treppenhaus, Flure, Keller- und Dachbodengänge sind Rettungswege und müssen frei bleiben. Kinderwagen, Rollatoren und Fahrräder nur dort abstellen, wo es ausdrücklich erlaubt ist.
Haus- und Hoftüren bitte geschlossen halten. Brennbare oder gefährliche Stoffe dürfen nicht im Keller oder auf dem Dachboden gelagert werden.
Rauchwarnmelder dürfen nicht entfernt, abgedeckt oder ausgeschaltet werden. Melden Sie Störungen bitte sofort.

# Lüften und Heizen
Lüften Sie mehrmals täglich kurz mit weit geöffnetem Fenster (Stoßlüften), besonders nach dem Duschen, Kochen und Wäschetrocknen. Dauerhaft gekippte Fenster kühlen die Wände aus und begünstigen Schimmel.
Heizen Sie alle Räume ausreichend; auch nicht genutzte Räume sollten nicht auskühlen. Bei Frost bitte Fenster in Keller und Treppenhaus geschlossen halten.

# Reinigung und Müll
Halten Sie Treppenhaus, Gemeinschaftsräume und Außenanlagen sauber. Verunreinigungen, die Sie verursachen, beseitigen Sie bitte umgehend.
Müll bitte getrennt und nur in die dafür vorgesehenen Behälter. Sperrmüll, Elektrogeräte und Sondermüll gehören nicht in die Hausmülltonnen.
Nichts in Toilette oder Abfluss werfen, was Leitungen verstopfen kann (z. B. Feuchttücher, Fett, Essensreste).

# Balkon, Grillen und Außenbereich
Blumenkästen sicher befestigen; beim Gießen darauf achten, dass kein Wasser nach unten läuft. Grillen auf dem Balkon nur mit Elektrogrill und ohne Belästigung der Nachbarn.
Bitte keine Teppiche oder Betten aus den Fenstern ausschütteln. Tauben und andere Wildtiere nicht füttern.

# Tiere
Kleintiere dürfen gehalten werden. Für Hunde und Katzen ist vorher die Zustimmung des Vermieters einzuholen. Tiere dürfen das Haus und die Außenanlagen nicht verunreinigen.

# Gemeinschaftseinrichtungen
Waschküche, Trockenraum und Fahrradkeller nutzen alle Mietparteien gemeinsam und hinterlassen sie sauber. Eine eventuelle Benutzungsordnung hängt dort aus.

# Schäden und Notfälle
Schäden in der Wohnung oder am Haus melden Sie bitte unverzüglich der Hausverwaltung – am einfachsten online über www.hadie-immobilien.de/schaden-melden/. Bei Wasserrohrbruch, Gasgeruch oder Feuer zuerst die Notrufnummern wählen und die Hausverwaltung informieren.

# Bauliche Veränderungen
Bauliche Veränderungen, das Anbringen von Außenantennen, Markisen oder Schildern sowie das Bohren in Fliesen und Fassaden bedürfen der vorherigen Zustimmung des Vermieters.`;

export const hausordnungText = (): string => absender().hausordnung || HAUSORDNUNG_STANDARD;
/** Text mit „# Überschrift“ und Absätzen in Briefbausteine verwandeln */
export function textBausteine(text: string): HTMLElement[] {
  const aus: HTMLElement[] = [];
  for (const zeile of String(text).split('\n').map((z) => z.trim())) {
    if (!zeile) continue;
    if (zeile.startsWith('#')) aus.push(h('h3', { class: 'din__para' }, zeile.replace(/^#+\s*/, '')));
    else if (/^[-•]\s/.test(zeile)) aus.push(h('p', { class: 'din__punkt' }, '• ', zeile.replace(/^[-•]\s*/, '')));
    else aus.push(h('p', {}, zeile));
  }
  return aus;
}
function hausordnungBlatt(k: Kontext): HTMLElement {
  const { m, objekt } = k;
  return bogen(anschriftMieter(k), `Hausordnung · ${anschrift(objekt)}`,
    briefInfo(['Objekt', objekt.bezeichnung], ['Einheit', k.einheit.bezeichnung]),
    h('p', {}, 'Die Hausordnung ist Bestandteil des Mietvertrags. Sie gilt für alle Bewohner, Besucher und Beauftragten der Mietpartei.'),
    ...textBausteine(hausordnungText()),
    ...(objekt.hausordnungZusatz ? [h('h3', { class: 'din__para' }, 'Besondere Regeln für dieses Haus'), ...textBausteine(objekt.hausordnungZusatz)] : []),
    h('p', {}, 'Ich/Wir haben die Hausordnung erhalten, zur Kenntnis genommen und erkennen sie als Bestandteil des Mietvertrags an.'),
    unterschriften(...personen(m).map((p) => `Mieter: ${p}`)));
}
routen.hausordnung = (id) => {
  const k = kontext(id);
  if (!k) return fehlt();
  return h('div', { class: 'vw-stapel' }, werkzeug(`#/mietverhaeltnis/${k.m.id}`), hausordnungBlatt(k));
};

/* ---------- Datenschutzinformation (Art. 13 DSGVO) ---------- */
function datenschutzBlatt(k: Kontext): HTMLElement {
  const a = absender();
  const vermieter = k.kunde ? [k.kunde.name, k.kunde.strasse, k.kunde.ort].filter(Boolean).join(', ') : 'Ihr Vermieter (siehe Mietvertrag)';
  const verwaltung = [a.name, a.strasse, a.ort].filter(Boolean).join(', ');
  return bogen(anschriftMieter(k), 'Datenschutzinformation für Mieter',
    briefInfo(['Objekt', k.objekt.bezeichnung], ['Einheit', k.einheit.bezeichnung]),
    h('p', {}, 'Nach Art. 13 der Datenschutz-Grundverordnung (DSGVO) informieren wir Sie, wie wir Ihre personenbezogenen Daten im Rahmen des Mietverhältnisses verarbeiten.'),
    ...textBausteine(`# Verantwortlich
Verantwortlich ist Ihr Vermieter: ${vermieter}. Mit der Verwaltung ist beauftragt: ${verwaltung}${a.email ? `, E-Mail ${a.email}` : ''}${a.telefon ? `, Telefon ${a.telefon}` : ''}. Dorthin können Sie sich mit allen Fragen zum Datenschutz wenden.
# Welche Daten und wofür
Wir verarbeiten Ihre Angaben aus Mietvertrag und Einzugsformular (Namen, Anschriften, Kontaktdaten, Haushaltsgröße, Bankverbindung), Daten zu Miete, Zahlungen, Kaution und Verbrauch sowie Ihre Anliegen und Schadensmeldungen. Zweck ist die Durchführung des Mietverhältnisses: Mietverwaltung, Betriebskostenabrechnung, Instandhaltung, Kommunikation mit Ihnen.
# Rechtsgrundlagen
Art. 6 Abs. 1 lit. b DSGVO (Durchführung des Mietvertrags), lit. c (gesetzliche Pflichten, z. B. Aufbewahrung, Wohnungsgeberbestätigung nach dem Bundesmeldegesetz) und lit. f (berechtigte Interessen, z. B. Durchsetzung von Ansprüchen, Sicherheit des Hauses). Für freiwillige Angaben wie einen Notfallkontakt oder den Versand per E-Mail ist Ihre Einwilligung die Grundlage (lit. a); Sie können sie jederzeit für die Zukunft widerrufen.
# Empfänger
Soweit erforderlich: beauftragte Handwerker und Dienstleister (z. B. Messdienst für Heiz- und Wasserkosten, Hausmeister), Versorger, Versicherungen, Steuerberater, Banken, im Streitfall Rechtsanwälte und Gerichte sowie Behörden, wenn eine gesetzliche Pflicht besteht. Dienstleister, die Daten in unserem Auftrag verarbeiten, sind vertraglich zum Datenschutz verpflichtet. Eine Übermittlung in Länder außerhalb der EU findet nicht statt.
# Speicherdauer
Wir speichern Ihre Daten für die Dauer des Mietverhältnisses und darüber hinaus, solange Ansprüche daraus verjähren können (in der Regel drei Jahre) und gesetzliche Aufbewahrungsfristen des Handels- und Steuerrechts bestehen (in der Regel sechs bis zehn Jahre). Danach werden sie gelöscht.
# Ihre Rechte
Sie haben das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21 DSGVO). Sie können sich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren, z. B. bei der Landesbeauftragten für Datenschutz und Informationsfreiheit Nordrhein-Westfalen.
# Pflicht zur Bereitstellung
Die Angaben im Mietvertrag sind für den Abschluss und die Durchführung des Mietverhältnisses erforderlich. Freiwillige Angaben sind als solche gekennzeichnet.`),
    h('p', {}, 'Ich/Wir haben diese Datenschutzinformation erhalten.'),
    unterschriften(...personen(k.m).map((p) => `Mieter: ${p}`)));
}
routen.datenschutzinfo = (id) => {
  const k = kontext(id);
  if (!k) return fehlt();
  return h('div', { class: 'vw-stapel' }, werkzeug(`#/mietverhaeltnis/${k.m.id}`), datenschutzBlatt(k));
};

/* ---------- Einzugsformular ---------- */
type Einzug = { bewohner?: string; klingel?: string; notfall?: string; kontoinhaber?: string; iban?: string; zahlweise?: string; tiere?: string; fahrzeug?: string; emailVersand?: boolean; ausgefuellt?: string };
function einzugsBlatt(k: Kontext): HTMLElement {
  const { m, einheit, objekt } = k;
  const e: Einzug = m.einzug ?? {};
  const zeile = (titel: string, wert?: string, frei = false) => h('tr', {}, h('th', {}, titel, frei ? h('small', { class: 'din__frei' }, ' (freiwillig)') : ''), h('td', {}, linie(wert)));
  return bogen(anschriftMieter(k), 'Einzugsformular',
    briefInfo(['Objekt', objekt.bezeichnung], ['Einheit', einheit.bezeichnung], ['Einzug', datum(m.beginn)]),
    h('p', {}, `Bitte prüfen und ergänzen Sie Ihre Angaben für ${wohnungText(einheit)}, ${anschrift(objekt)}. So können wir Sie erreichen und alles richtig abrechnen.`),
    h('h3', { class: 'din__para' }, 'Mieter und Haushalt'),
    h('table', { class: 'vw-brief__tabelle din__formular' }, h('tbody', {},
      zeile('Mieter laut Vertrag', personen(m).join(', ')),
      zeile('Weitere Bewohner (Name, z. B. Kind)', e.bewohner),
      zeile('Personen im Haushalt insgesamt', m.personen ? String(m.personen) : ''),
      zeile('Name an Klingel und Briefkasten', e.klingel),
      zeile('Telefon', m.telefon), zeile('E-Mail', m.email),
      zeile('Notfallkontakt (Name, Telefon)', e.notfall, true))),
    h('h3', { class: 'din__para' }, 'Miete und Bankverbindung'),
    h('table', { class: 'vw-brief__tabelle din__formular' }, h('tbody', {},
      zeile('Kontoinhaber', e.kontoinhaber), zeile('IBAN', e.iban),
      h('tr', {}, h('th', {}, 'Zahlung der Miete'), h('td', {}, `${kasten(e.zahlweise === 'Dauerauftrag')} Dauerauftrag    ${kasten(e.zahlweise === 'SEPA-Lastschrift')} SEPA-Lastschrift (Mandat liegt bei)`)))),
    h('p', { class: 'vw-fein' }, 'Die Bankverbindung nutzen wir für Erstattungen (z. B. Guthaben aus der Betriebskostenabrechnung, Kaution) und – nur mit Mandat – für den Lastschrifteinzug.'),
    h('h3', { class: 'din__para' }, 'Weitere Angaben'),
    h('table', { class: 'vw-brief__tabelle din__formular' }, h('tbody', {},
      zeile('Haustiere (Art, Anzahl)', e.tiere),
      zeile('Kfz-Kennzeichen (bei Stellplatz)', e.fahrzeug, true),
      h('tr', {}, h('th', {}, 'Schreiben per E-Mail', h('small', { class: 'din__frei' }, ' (freiwillig)')), h('td', {}, `${kasten(!!e.emailVersand)} Ich bin einverstanden, dass mir Schreiben ohne Unterschriftserfordernis (z. B. Abrechnungen, Mitteilungen) per E-Mail zugehen. Widerruf jederzeit möglich.`)))),
    h('h3', { class: 'din__para' }, 'Bitte denken Sie an'),
    h('p', { class: 'din__punkt' }, '• Anmeldung bei der Meldebehörde innerhalb von zwei Wochen nach dem Einzug – die Wohnungsgeberbestätigung erhalten Sie von uns.'),
    h('p', { class: 'din__punkt' }, '• Strom (und ggf. Gas) beim Versorger Ihrer Wahl mit dem Zählerstand vom Übergabeprotokoll anmelden.'),
    h('p', { class: 'din__punkt' }, '• Rundfunkbeitrag anmelden oder Ihre Adresse ändern (rundfunkbeitrag.de).'),
    h('p', { class: 'din__punkt' }, '• Eine Hausrat- und Privathaftpflichtversicherung wird empfohlen.'),
    h('p', {}, 'Die Hausordnung und die Datenschutzinformation habe ich/haben wir erhalten. Änderungen meiner Angaben teile ich der Hausverwaltung mit.'),
    unterschriften(...personen(m).map((p) => `Mieter: ${p}`)));
}
routen.einzugsformular = (id) => {
  const k = kontext(id);
  if (!k) return fehlt();
  const { m } = k;
  const e: Einzug = { ...(m.einzug ?? {}) };
  const eingabe = (name: keyof Einzug, label: string, extra: Record<string, any> = {}) => h('div', { class: 'feld' }, h('label', { for: `ez-${name}` }, label),
    h('input', { id: `ez-${name}`, value: (e[name] as string) ?? '', oninput: (ev: Event) => { (e as any)[name] = (ev.target as HTMLInputElement).value; }, ...extra }));
  const tel = h('input', { id: 'ez-tel', value: m.telefon ?? '' }) as HTMLInputElement;
  const mail = h('input', { id: 'ez-mail', type: 'email', value: m.email ?? '' }) as HTMLInputElement;
  const pers = h('input', { id: 'ez-pers', type: 'number', min: 1, value: m.personen ?? 1 }) as HTMLInputElement;
  const speichern = () => {
    speichere('mieter', { id: m.id, telefon: tel.value.trim(), email: mail.value.trim(), personen: Number(pers.value) || 1, einzug: { ...e, iban: String(e.iban ?? '').replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim(), ausgefuellt: e.ausgefuellt || heute() } });
    hinweis('Angaben gespeichert');
    zeichne();
  };
  return h('div', { class: 'vw-stapel' },
    werkzeug(`#/mietverhaeltnis/${m.id}`),
    h('section', { class: 'vw-karte vw-nichtdrucken' },
      h('header', { class: 'vw-karte__kopf' }, h('h2', {}, 'Angaben erfassen'), h('span', {}, m.einzug?.ausgefuellt ? `erfasst am ${datum(m.einzug.ausgefuellt)}` : 'Leer drucken und vom Mieter ausfüllen lassen – oder hier eintragen')),
      h('div', { class: 'vw-innen vw-form__felder' },
        eingabe('bewohner', 'Weitere Bewohner'), h('div', { class: 'feld' }, h('label', { for: 'ez-pers' }, 'Personen im Haushalt'), pers),
        eingabe('klingel', 'Name an Klingel und Briefkasten'),
        h('div', { class: 'feld' }, h('label', { for: 'ez-tel' }, 'Telefon'), tel), h('div', { class: 'feld' }, h('label', { for: 'ez-mail' }, 'E-Mail'), mail),
        eingabe('notfall', 'Notfallkontakt (freiwillig)'),
        eingabe('kontoinhaber', 'Kontoinhaber'), eingabe('iban', 'IBAN', { autocomplete: 'off' }),
        h('div', { class: 'feld' }, h('label', { for: 'ez-zw' }, 'Zahlung der Miete'),
          h('select', { id: 'ez-zw', onchange: (ev: Event) => { e.zahlweise = (ev.target as HTMLSelectElement).value; } }, ['', 'Dauerauftrag', 'SEPA-Lastschrift'].map((o) => h('option', { value: o, selected: o === (e.zahlweise ?? '') }, o || 'Bitte wählen')))),
        eingabe('tiere', 'Haustiere'), eingabe('fahrzeug', 'Kfz-Kennzeichen (freiwillig)'),
        h('label', { class: 'vw-haken feld--breit' }, h('input', { type: 'checkbox', checked: !!e.emailVersand, onchange: (ev: Event) => { e.emailVersand = (ev.target as HTMLInputElement).checked; } }), ' Einverstanden mit Schreiben per E-Mail'),
        h('div', { class: 'feld--breit vw-reihe' }, h('button', { class: 'vw-knopf vw-knopf--voll', onclick: speichern }, 'Speichern'),
          e.zahlweise === 'SEPA-Lastschrift' && h('a', { class: 'vw-knopf', href: `#/sepamandat/${m.id}` }, 'SEPA-Mandat')))),
    einzugsBlatt(k));
};

/* ---------- SEPA-Lastschriftmandat ---------- */
const mandatsreferenz = (m: Satz) => `MIETE-${String(m.id).slice(-8).toUpperCase()}`;
function sepaBlatt(k: Kontext): HTMLElement {
  const { m, objekt } = k;
  const mk = mietkonto(objekt.id);
  const e: Einzug = m.einzug ?? {};
  const empf = mk?.inhaber || '______________________________';
  return bogen(anschriftMieter(k), 'SEPA-Lastschriftmandat',
    briefInfo(['Objekt', objekt.bezeichnung], ['Einheit', k.einheit.bezeichnung]),
    h('table', { class: 'vw-brief__tabelle din__formular' }, h('tbody', {},
      h('tr', {}, h('th', {}, 'Zahlungsempfänger'), h('td', {}, empf)),
      h('tr', {}, h('th', {}, 'Gläubiger-Identifikationsnummer'), h('td', {}, linie(mk?.glaeubigerId))),
      h('tr', {}, h('th', {}, 'Mandatsreferenz'), h('td', {}, mandatsreferenz(m))),
      h('tr', {}, h('th', {}, 'Zahlungsart'), h('td', {}, 'Wiederkehrende Zahlung')),
      h('tr', {}, h('th', {}, 'Verwendungszweck'), h('td', {}, `Miete ${objekt.bezeichnung}, ${k.einheit.bezeichnung} – derzeit ${geld(mieteAm(m, m.beginn > heute() ? m.beginn : heute()) + zahl(m.nebenkosten))} monatlich`)))),
    h('p', {}, `Ich ermächtige/Wir ermächtigen ${empf}, Zahlungen von meinem/unserem Konto mittels Lastschrift einzuziehen. Zugleich weise ich mein/weisen wir unser Kreditinstitut an, die von ${empf} auf mein/unser Konto gezogenen Lastschriften einzulösen.`),
    h('p', {}, 'Hinweis: Ich kann/Wir können innerhalb von acht Wochen, beginnend mit dem Belastungsdatum, die Erstattung des belasteten Betrages verlangen. Es gelten dabei die mit meinem/unserem Kreditinstitut vereinbarten Bedingungen.'),
    h('p', {}, 'Eingezogen wird die jeweils geschuldete Miete einschließlich Vorauszahlungen; Änderungen (z. B. nach einer Mietanpassung) teilen wir vorher mit.'),
    h('table', { class: 'vw-brief__tabelle din__formular' }, h('tbody', {},
      h('tr', {}, h('th', {}, 'Kontoinhaber'), h('td', {}, linie(e.kontoinhaber))),
      h('tr', {}, h('th', {}, 'Anschrift'), h('td', {}, linie(anschriftMieter(k).slice(personen(m).length > 1 ? 2 : 1).join(', ')))),
      h('tr', {}, h('th', {}, 'IBAN'), h('td', {}, linie(e.iban))))),
    unterschriften('Unterschrift Kontoinhaber'));
}
routen.sepamandat = (id) => {
  const k = kontext(id);
  if (!k) return fehlt();
  const mk = mietkonto(k.objekt.id);
  return h('div', { class: 'vw-stapel' }, werkzeug(`#/mietverhaeltnis/${k.m.id}`),
    !mk && h('p', { class: 'vw-warnung vw-nichtdrucken' }, 'Für dieses Objekt ist kein Mietkonto hinterlegt (Objekt → Finanzen).'),
    mk && !mk.glaeubigerId && h('p', { class: 'vw-warnung vw-nichtdrucken' }, 'Beim Mietkonto fehlt die Gläubiger-Identifikationsnummer. Ohne sie ist kein Lastschrifteinzug möglich; sie wird bei der Deutschen Bundesbank beantragt.'),
    sepaBlatt(k));
};

/* ---------- Willkommensschreiben ---------- */
function willkommenBlatt(k: Kontext): HTMLElement {
  const { m, einheit, objekt } = k;
  const a = absender();
  const betreuer = finde('mitarbeiter', objekt.betreuerId);
  const mk = mietkonto(objekt.id);
  const miete = mieteAm(m, m.beginn > heute() ? m.beginn : heute()) + zahl(m.nebenkosten);
  return bogen(anschriftMieter(k), `Herzlich willkommen in ${anschrift(objekt)}`,
    briefInfo(['Objekt', objekt.bezeichnung], ['Einheit', einheit.bezeichnung]),
    h('p', {}, anredeZeile(m)),
    h('p', {}, `wir freuen uns, Sie als neue Mieter begrüßen zu dürfen, und wünschen Ihnen einen guten Start in ${wohnungText(einheit)} – auf eine gute Zusammenarbeit! Hier das Wichtigste auf einen Blick:`),
    h('h3', { class: 'din__para' }, 'Ihr Ansprechpartner'),
    h('p', {}, betreuer ? `${betreuer.name}${betreuer.telefon ? `, Telefon ${betreuer.telefon}` : ''}${betreuer.email ? `, E-Mail ${betreuer.email}` : ''}` : `${a.name}${a.telefon ? `, Telefon ${a.telefon}` : ''}${a.email ? `, E-Mail ${a.email}` : ''}`),
    h('h3', { class: 'din__para' }, 'Ihre Miete'),
    h('p', {}, `Monatlich ${geld(miete)}, fällig bis zum dritten Werktag des Monats${mk ? ` auf das Konto ${mk.inhaber ? `${mk.inhaber}, ` : ''}IBAN ${mk.iban}` : ''}. Verwendungszweck: „Miete ${einheit.bezeichnung}, ${personen(m)[0]}“.`),
    h('h3', { class: 'din__para' }, 'Schaden oder Störung?'),
    h('p', {}, 'Bitte sofort melden – online mit Foto unter www.hadie-immobilien.de/schaden-melden/ oder telefonisch. Bei Feuer, Gasgeruch oder Wasserrohrbruch zuerst 112 bzw. den Störungsdienst des Versorgers anrufen, danach uns.'),
    objekt.notfall && h('p', { class: 'din__vereinbart' }, objekt.notfall),
    h('h3', { class: 'din__para' }, 'Bitte in den ersten Tagen erledigen'),
    h('p', { class: 'din__punkt' }, '• Anmeldung bei der Meldebehörde innerhalb von zwei Wochen (Wohnungsgeberbestätigung liegt bei).'),
    h('p', { class: 'din__punkt' }, '• Strom (und ggf. Gas) mit dem Zählerstand aus dem Übergabeprotokoll anmelden.'),
    h('p', { class: 'din__punkt' }, '• Rundfunkbeitrag an- oder ummelden.'),
    ...(objekt.hausordnungZusatz ? [h('h3', { class: 'din__para' }, 'Gut zu wissen in Ihrem Haus'), ...textBausteine(objekt.hausordnungZusatz)] : []),
    ...gruss());
}
routen.willkommen = (id) => {
  const k = kontext(id);
  if (!k) return fehlt();
  return h('div', { class: 'vw-stapel' }, werkzeug(`#/mietverhaeltnis/${k.m.id}`), willkommenBlatt(k));
};

/* ---------- Vertragsmappe ---------- */
const MAPPE: [string, string][] = [
  ['mietvertrag', 'Mietvertrag'], ['hausordnung', 'Hausordnung'], ['datenschutz', 'Datenschutzinformation'],
  ['einzug', 'Einzugsformular'], ['sepa', 'SEPA-Lastschriftmandat'], ['wgb', 'Wohnungsgeberbestätigung'], ['willkommen', 'Willkommensschreiben'],
];
let mappeWahl: Record<string, boolean> = {};
let mappeFuer = '';
routen.vertragsmappe = (id) => {
  const k = kontext(id);
  if (!k) return fehlt();
  const { m } = k;
  const sepa = m.einzug?.zahlweise === 'SEPA-Lastschrift';
  if (mappeFuer !== m.id) { mappeFuer = m.id; mappeWahl = { mietvertrag: true, hausordnung: true, datenschutz: true, einzug: true, sepa, wgb: true, willkommen: true }; }
  const nur = (el: HTMLElement | null | undefined) => el?.querySelector('.vw-brief.din') as HTMLElement | null;
  const bauen: Record<string, () => HTMLElement | null> = {
    mietvertrag: () => nur(routen.mietvertrag(m.id)),
    hausordnung: () => hausordnungBlatt(k),
    datenschutz: () => datenschutzBlatt(k),
    einzug: () => einzugsBlatt(k),
    sepa: () => sepaBlatt(k),
    wgb: () => nur(routen.wohnungsgeber(m.id, 'einzug')),
    willkommen: () => willkommenBlatt(k),
  };
  const blaetter = MAPPE.filter(([key]) => mappeWahl[key]).map(([key]) => bauen[key]()).filter(Boolean) as HTMLElement[];
  const a = absender();
  return h('div', { class: 'vw-stapel' },
    werkzeug(`#/mietverhaeltnis/${m.id}`,
      h('button', { class: 'vw-knopf', onclick: () => { speichere('mieter', { id: m.id, schritte: { ...(m.schritte ?? {}), mappe: heute() } }); hinweis('Ausgabe der Unterlagen vermerkt'); } }, 'Als ausgehändigt vermerken')),
    h('section', { class: 'vw-karte vw-nichtdrucken' },
      h('header', { class: 'vw-karte__kopf' }, h('h2', {}, 'Vertragsmappe'), h('span', {}, `${blaetter.length} Dokumente · jedes beginnt auf einer neuen Seite`)),
      h('div', { class: 'vw-innen vw-mehr' }, MAPPE.map(([key, titel]) => h('label', { class: 'vw-haken' },
        h('input', { type: 'checkbox', checked: !!mappeWahl[key], onchange: (e: Event) => { mappeWahl[key] = (e.target as HTMLInputElement).checked; zeichne(); } }), ' ', titel,
        key === 'sepa' && !sepa ? h('small', {}, ' (nur bei Lastschrift)') : '')))),
    h('div', { class: 'din-unterlagen' },
      h('div', { class: 'din__folgekopf din__folgekopf--mappe', 'aria-hidden': 'true' }, h('span', {}, a.name), h('span', {}, `Vertragsunterlagen · ${personen(m).join(', ')}`)),
      ...blaetter));
};

/* ---------- Hausordnung als Vorlage pflegen (Administration → Unternehmen) ---------- */
export function hausordnungKarte(): HTMLElement {
  const vorhanden = alle('absender')[0];
  const feld = h('textarea', { rows: 16, class: 'vw-vorlage', 'aria-label': 'Hausordnung' }, hausordnungText()) as HTMLTextAreaElement;
  return h('section', { class: 'vw-karte' },
    h('header', { class: 'vw-karte__kopf' }, h('h2', {}, 'Hausordnung (Vorlage)'), h('span', {}, absender().hausordnung ? 'eigene Fassung' : 'Standardfassung')),
    h('div', { class: 'vw-innen' },
      h('p', { class: 'vw-fein' }, 'Gilt für alle Häuser und wird vom Mieter unterschrieben. Zeilen mit „#“ am Anfang sind Überschriften. Besonderheiten eines Hauses (Mülltage, Reinigungsplan) tragen Sie im Objekt unter „Hausordnung: Regeln dieses Hauses“ ein.'),
      feld,
      h('div', { class: 'vw-reihe' },
        h('button', { class: 'vw-knopf vw-knopf--voll', disabled: !vorhanden, onclick: () => { speichere('absender', { id: vorhanden!.id, hausordnung: feld.value.trim() }); hinweis('Hausordnung gespeichert'); } }, 'Speichern'),
        h('button', { class: 'vw-knopf', disabled: !vorhanden, onclick: () => { if (confirm('Standardfassung wiederherstellen?')) { speichere('absender', { id: vorhanden!.id, hausordnung: '' }); hinweis('Standardfassung aktiv'); } } }, 'Standard wiederherstellen'),
        !vorhanden && h('small', {}, 'Bitte zuerst die Unternehmensdaten anlegen.'))));
}
