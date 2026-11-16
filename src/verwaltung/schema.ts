/**
 * DATENMODELL des Verwaltertools
 * ---------------------------------------------------------------
 * Jeder Eintrag beschreibt eine Art von Datensatz: seine Felder, die
 * Spalten der Liste und den Bereich (Kreis), zu dem er gehört.
 * Listen und Formulare entstehen automatisch daraus. Ein neues Feld
 * braucht nur eine Zeile unter `felder`.
 */
import { alle, finde, type Satz } from './speicher';

export type Feld = {
  name: string;
  label: string;
  typ: 'text' | 'lang' | 'zahl' | 'geld' | 'datum' | 'monat' | 'wahl' | 'ref' | 'ja' | 'mehr';
  optionen?: string[];
  auf?: string; // Zieltabelle bei typ 'ref'
  pflicht?: boolean;
  hilfe?: string;
  vorgabe?: any;
};
export type Art = {
  titel: string;
  einzahl: string;
  kreis: 'basis' | 'verwalten' | 'betreuen' | 'erneuern' | 'entwickeln';
  felder: Feld[];
  spalten: string[];
  anzeige: (s: Satz) => string;
  leer: string;
};

const f = (name: string, label: string, typ: Feld['typ'] = 'text', extra: Partial<Feld> = {}): Feld => ({ name, label, typ, ...extra });
const objekt = f('objektId', 'Objekt', 'ref', { auf: 'objekte', pflicht: true });

export const KREISE = {
  verwalten: 'Verwalten',
  betreuen: 'Betreuen',
  erneuern: 'Erneuern',
  entwickeln: 'Entwickeln',
} as const;

export const KOSTENARTEN = [
  'Grundsteuer', 'Wasser', 'Abwasser', 'Heizung', 'Warmwasser', 'Aufzug', 'Straßenreinigung', 'Müllabfuhr',
  'Gebäudereinigung', 'Gartenpflege', 'Beleuchtung / Allgemeinstrom', 'Schornsteinfeger', 'Versicherungen',
  'Hausmeister', 'Winterdienst', 'Antenne / Kabel', 'Wartung', 'Sonstige Betriebskosten',
  'Reparatur / Instandhaltung', 'Verwaltungskosten', 'Sonstiges (nicht umlagefähig)',
];
export const SERVICELEISTUNGEN = [
  'Mülltonnendienst', 'Tonnenreinigung', 'Winterdienst', 'Treppenhausreinigung', 'Kellerreinigung', 'Fensterreinigung',
  'Gartenpflege', 'Rasen mähen', 'Heckenschnitt', 'Laub beseitigen', 'Hausmeister-Kontrollgang', 'Dachrinnenreinigung',
  'Spielplatzkontrolle', 'Leerstandskontrolle', 'Zählerablesung', 'Sonstiges',
];
export const FRISTARTEN = [
  'Heizungswartung', 'Aufzugsprüfung', 'Rauchwarnmelder', 'Trinkwasserprüfung (Legionellen)', 'Elektroprüfung',
  'Brandschutz / Feuerlöscher', 'Gasanlage', 'Schornsteinfeger', 'Baumkontrolle', 'Spielplatzprüfung',
  'Dachkontrolle', 'Rückstauklappe', 'Energieausweis', 'Betriebskostenabrechnung', 'Sonstige Frist',
];
export const GEWERKE = [
  'Wohnungsrenovierung', 'Malerarbeiten', 'Bodenbelag', 'Fliesen', 'Trockenbau', 'Bad', 'Sanitär', 'Heizung', 'Elektro',
  'Fenster / Türen', 'Dach', 'Fassade', 'Balkon', 'Keller / Feuchtigkeit', 'Schimmel', 'Treppenhaus', 'Außenanlagen',
  'Energetische Sanierung', 'Barrierereduzierung', 'Wasserschaden', 'Brandschaden', 'Sonstiges',
];

export const ARTEN: Record<string, Art> = {
  /* ---------------- Stammdaten ---------------- */
  kunden: {
    titel: 'Kunden', einzahl: 'Kunde', kreis: 'basis',
    felder: [
      f('kundennummer', 'Kundennummer', 'text', { hilfe: 'Wird automatisch vergeben, wenn leer. Mit dieser Nummer meldet sich der Kunde später im Kundenbereich an.' }),
      f('name', 'Name / Firma', 'text', { pflicht: true }),
      f('art', 'Kundenart', 'wahl', { optionen: ['Eigentümer', 'Eigentümergemeinschaft', 'Investor', 'Erbengemeinschaft'], vorgabe: 'Eigentümer' }),
      f('strasse', 'Straße und Hausnummer'), f('ort', 'PLZ und Ort'),
      f('telefon', 'Telefon'), f('email', 'E-Mail'), f('notiz', 'Notiz', 'lang'),
    ],
    spalten: ['kundennummer', 'name', 'art', 'telefon'],
    anzeige: (s) => s.name,
    leer: 'Kunden sind die Eigentümer, für die Sie arbeiten. Jeder Kunde bekommt eine Kundennummer.',
  },
  objekte: {
    titel: 'Objekte', einzahl: 'Objekt', kreis: 'basis',
    felder: [
      f('bezeichnung', 'Bezeichnung', 'text', { pflicht: true, hilfe: 'z. B. Straße und Hausnummer' }),
      f('strasse', 'Straße und Hausnummer'), f('ort', 'PLZ und Ort'),
      f('art', 'Objektart', 'wahl', { optionen: ['Mietshaus', 'Eigentümergemeinschaft (WEG)', 'Einzelwohnung', 'Gewerbeobjekt', 'Gemischt genutzt'], vorgabe: 'Mietshaus' }),
      f('kundeId', 'Kunde (Eigentümer)', 'ref', { auf: 'kunden' }),
      f('leistungen', 'Gebuchte Leistungen (360°)', 'mehr', { optionen: Object.values(KREISE), vorgabe: ['Verwalten'] }),
      f('baujahr', 'Baujahr', 'zahl'),
      f('mietspiegel', 'Mietspiegel / Quelle der Vergleichsmiete', 'text', { hilfe: 'z. B. „Mietspiegel Paderborn 2024“. Erscheint im Erhöhungsschreiben.' }),
      f('angespannt', 'Gebiet mit angespanntem Wohnungsmarkt (Kappungsgrenze 15 %)', 'ja', { hilfe: 'Gilt nur, wenn die Gemeinde per Landesverordnung festgelegt ist. Sonst gilt 20 %.' }),
      f('notiz', 'Notiz', 'lang'),
    ],
    spalten: ['bezeichnung', 'ort', 'art', 'kundeId'],
    anzeige: (s) => s.bezeichnung,
    leer: 'Legen Sie Ihr erstes Objekt an. Alles Weitere – Einheiten, Mieter, Service, Aufträge – hängt daran.',
  },
  einheiten: {
    titel: 'Einheiten', einzahl: 'Einheit', kreis: 'basis',
    felder: [
      objekt, f('bezeichnung', 'Bezeichnung', 'text', { pflicht: true, hilfe: 'z. B. Wohnung 3' }),
      f('lage', 'Lage', 'text', { hilfe: 'z. B. 1. OG links' }),
      f('art', 'Art', 'wahl', { optionen: ['Wohnung', 'Gewerbe', 'Garage / Stellplatz', 'Sonstiges'], vorgabe: 'Wohnung' }),
      f('flaeche', 'Fläche in m²', 'zahl'), f('zimmer', 'Zimmer', 'zahl'),
      f('vergleichsmiete', 'Ortsübliche Vergleichsmiete in €/m² (kalt)', 'geld', { hilfe: 'Aus dem Mietspiegel für diese Wohnung (Lage, Ausstattung, Baujahr).' }),
    ],
    spalten: ['objektId', 'bezeichnung', 'lage', 'flaeche'],
    anzeige: (s) => `${finde('objekte', s.objektId)?.bezeichnung ?? '?'} · ${s.bezeichnung}`,
    leer: 'Einheiten sind die Wohnungen, Gewerbe und Stellplätze eines Objekts.',
  },
  firmen: {
    titel: 'Firmen & Handwerker', einzahl: 'Firma', kreis: 'basis',
    felder: [
      f('name', 'Firma', 'text', { pflicht: true }), f('gewerk', 'Gewerk / Leistung'),
      f('ansprechpartner', 'Ansprechpartner'), f('telefon', 'Telefon'), f('email', 'E-Mail'), f('notiz', 'Notiz', 'lang'),
    ],
    spalten: ['name', 'gewerk', 'ansprechpartner', 'telefon'],
    anzeige: (s) => s.name,
    leer: 'Fachfirmen und Dienstleister, mit denen Sie arbeiten – etwa für Großprojekte oder Wartungen.',
  },

  /* ---------------- Kreis 1 · Verwalten ---------------- */
  mieter: {
    titel: 'Mietverhältnisse', einzahl: 'Mietverhältnis', kreis: 'verwalten',
    felder: [
      f('einheitId', 'Einheit', 'ref', { auf: 'einheiten', pflicht: true }),
      f('name', 'Mieter', 'text', { pflicht: true }), f('telefon', 'Telefon'), f('email', 'E-Mail'),
      f('beginn', 'Mietbeginn', 'datum', { pflicht: true }), f('ende', 'Mietende', 'datum', { hilfe: 'Leer lassen, solange das Mietverhältnis läuft.' }),
      f('kaltmiete', 'Kaltmiete monatlich', 'geld', { pflicht: true }), f('nebenkosten', 'Nebenkosten-Vorauszahlung monatlich', 'geld'),
      f('personen', 'Personen im Haushalt', 'zahl', { vorgabe: 1 }),
      f('mietart', 'Mietart', 'wahl', { optionen: ['Normale Miete', 'Staffelmiete', 'Indexmiete'], vorgabe: 'Normale Miete', hilfe: 'Bei Staffel- und Indexmiete ist eine Erhöhung auf die Vergleichsmiete ausgeschlossen.' }),
      f('kautionSoll', 'Kaution vereinbart', 'geld'), f('kautionIst', 'Kaution erhalten', 'geld'), f('notiz', 'Notiz', 'lang'),
    ],
    spalten: ['einheitId', 'name', 'beginn', 'ende', 'kaltmiete'],
    anzeige: (s) => `${s.name} (${ARTEN.einheiten.anzeige(finde('einheiten', s.einheitId) ?? ({} as Satz))})`,
    leer: 'Ein Mietverhältnis verbindet einen Mieter mit einer Einheit – mit Miete, Vorauszahlung und Kaution.',
  },
  mietaenderungen: {
    titel: 'Mietverlauf', einzahl: 'Mietänderung', kreis: 'verwalten',
    felder: [
      f('mieterId', 'Mietverhältnis', 'ref', { auf: 'mieter', pflicht: true }), f('ab', 'Gilt ab', 'datum', { pflicht: true }),
      f('alt', 'Bisherige Kaltmiete', 'geld', { pflicht: true }), f('kaltmiete', 'Neue Kaltmiete', 'geld', { pflicht: true }),
      f('grund', 'Grund', 'wahl', { optionen: ['§ 558 Vergleichsmiete', 'Modernisierung (§ 559)', 'Staffelmiete', 'Indexmiete', 'Vereinbarung'], pflicht: true, hilfe: 'Erhöhungen nach § 559 zählen bei Sperrfrist und Kappungsgrenze anders; bitte richtig wählen.' }),
      f('notiz', 'Notiz'),
    ],
    spalten: ['mieterId', 'ab', 'alt', 'kaltmiete', 'grund'],
    anzeige: (s) => `${s.ab} → ${s.kaltmiete} €`,
    leer: 'Frühere Mieterhöhungen. Das Tool prüft damit Sperrfrist und Kappungsgrenze. Ohne Einträge gilt: unverändert seit Mietbeginn.',
  },
  mieterhoehungen: {
    titel: 'Mieterhöhungen', einzahl: 'Mieterhöhung', kreis: 'verwalten',
    felder: [
      f('mieterId', 'Mietverhältnis', 'ref', { auf: 'mieter', pflicht: true }), f('zugang', 'Zugang beim Mieter', 'datum', { pflicht: true, hilfe: 'Tag, an dem das Schreiben dem Mieter zugeht. Davon hängen Fristen und Wirksamkeit ab.' }),
      f('neueMiete', 'Neue Kaltmiete', 'geld', { pflicht: true }),
      f('begruendung', 'Begründung durch', 'wahl', { optionen: ['Mietspiegel', 'Mietdatenbank', 'Gutachten', 'Vergleichswohnungen'], vorgabe: 'Mietspiegel', pflicht: true }),
      f('quelle', 'Fundstelle der Begründung', 'lang', { pflicht: true, hilfe: 'Ohne Fundstelle (Mietspiegel mit Feld, Gutachten, drei Vergleichswohnungen mit Anschrift) ist das Verlangen unwirksam.' }),
      f('status', 'Status', 'wahl', { optionen: ['Entwurf', 'Versandt', 'Zugestimmt', 'Abgelehnt'], vorgabe: 'Entwurf' }),
      f('notiz', 'Notiz'),
    ],
    spalten: ['mieterId', 'zugang', 'neueMiete', 'status'],
    anzeige: (s) => `Erhöhung ${s.zugang}`,
    leer: 'Mieterhöhungsverlangen von der Vorbereitung bis zur Zustimmung. Anlegen am besten über „Mieterhöhung“.',
  },
  zahlungen: {
    titel: 'Zahlungseingänge', einzahl: 'Zahlung', kreis: 'verwalten',
    felder: [
      f('mieterId', 'Mietverhältnis', 'ref', { auf: 'mieter', pflicht: true }),
      f('monat', 'Für Monat', 'monat', { pflicht: true }), f('betrag', 'Betrag', 'geld', { pflicht: true }),
      f('datum', 'Eingang am', 'datum', { pflicht: true }), f('notiz', 'Notiz'),
    ],
    spalten: ['mieterId', 'monat', 'betrag', 'datum'],
    anzeige: (s) => `${s.monat} · ${s.betrag} €`,
    leer: 'Zahlungen buchen Sie am schnellsten über „Mieten“.',
  },
  kosten: {
    titel: 'Kosten & Belege', einzahl: 'Beleg', kreis: 'verwalten',
    felder: [
      objekt, f('datum', 'Datum', 'datum', { pflicht: true }),
      f('kostenart', 'Kostenart', 'wahl', { optionen: KOSTENARTEN, pflicht: true }),
      f('betrag', 'Betrag', 'geld', { pflicht: true }),
      f('umlage', 'Auf Mieter umlagefähig', 'ja', { vorgabe: true }),
      f('schluessel', 'Umlageschlüssel', 'wahl', { optionen: ['Wohnfläche', 'Einheiten', 'Personen'], vorgabe: 'Wohnfläche' }),
      f('empfaenger', 'Rechnungssteller'),
      f('auftragId', 'Gehört zu Auftrag', 'ref', { auf: 'auftraege', hilfe: 'Zählt dann zu den Kosten dieses Auftrags.' }),
      f('projektId', 'Gehört zu Projekt', 'ref', { auf: 'projekte' }), f('notiz', 'Notiz'),
    ],
    spalten: ['objektId', 'datum', 'kostenart', 'betrag', 'umlage'],
    anzeige: (s) => `${s.kostenart} ${s.datum}`,
    leer: 'Erfassen Sie Rechnungen und Belege. Umlagefähige Kosten fließen in die Nebenkostenabrechnung.',
  },
  zaehler: {
    titel: 'Zählerstände', einzahl: 'Zählerstand', kreis: 'verwalten',
    felder: [
      objekt, f('einheitId', 'Einheit', 'ref', { auf: 'einheiten' }),
      f('art', 'Zählerart', 'wahl', { optionen: ['Kaltwasser', 'Warmwasser', 'Strom', 'Gas', 'Heizung / Wärme', 'Sonstiges'], pflicht: true }),
      f('nummer', 'Zählernummer'), f('datum', 'Abgelesen am', 'datum', { pflicht: true }), f('stand', 'Stand', 'zahl', { pflicht: true }),
    ],
    spalten: ['objektId', 'einheitId', 'art', 'datum', 'stand'],
    anzeige: (s) => `${s.art} ${s.datum}`,
    leer: 'Zählerstände bei Ein- und Auszug und zur jährlichen Ablesung.',
  },
  fristen: {
    titel: 'Fristen & Wartungen', einzahl: 'Frist', kreis: 'verwalten',
    felder: [
      objekt, f('art', 'Was ist fällig?', 'wahl', { optionen: FRISTARTEN, pflicht: true }),
      f('faellig', 'Fällig am', 'datum', { pflicht: true }),
      f('intervall', 'Wiederholt sich alle … Monate', 'zahl', { hilfe: 'Leer oder 0 = einmalig.' }),
      f('firmaId', 'Zuständige Firma', 'ref', { auf: 'firmen' }), f('erledigt', 'Erledigt', 'ja'), f('notiz', 'Notiz'),
    ],
    spalten: ['objektId', 'art', 'faellig', 'intervall', 'firmaId'],
    anzeige: (s) => `${s.art} ${s.faellig}`,
    leer: 'Prüf- und Wartungstermine, die Sie nicht verpassen dürfen: Heizung, Aufzug, Rauchwarnmelder, Trinkwasser …',
  },
  vertraege: {
    titel: 'Verträge & Versicherungen', einzahl: 'Vertrag', kreis: 'verwalten',
    felder: [
      objekt, f('art', 'Art', 'wahl', { optionen: ['Gebäudeversicherung', 'Haftpflichtversicherung', 'Strom', 'Gas', 'Wasser', 'Wartungsvertrag', 'Dienstleistungsvertrag', 'Sonstiger Vertrag'], pflicht: true }),
      f('partner', 'Vertragspartner', 'text', { pflicht: true }), f('nummer', 'Vertragsnummer'),
      f('beginn', 'Beginn', 'datum'), f('kuendigenBis', 'Kündbar bis', 'datum', { hilfe: 'Letzter Tag, an dem die Kündigung zugehen muss.' }),
      f('kosten', 'Kosten pro Jahr', 'geld'), f('notiz', 'Notiz'),
    ],
    spalten: ['objektId', 'art', 'partner', 'kuendigenBis', 'kosten'],
    anzeige: (s) => `${s.art} · ${s.partner}`,
    leer: 'Versorger-, Wartungs- und Versicherungsverträge mit Kündigungsfristen.',
  },
  beschluesse: {
    titel: 'Beschluss-Sammlung (WEG)', einzahl: 'Beschluss', kreis: 'verwalten',
    felder: [
      objekt, f('datum', 'Datum', 'datum', { pflicht: true }), f('nummer', 'Laufende Nummer'),
      f('art', 'Zustande gekommen in', 'wahl', { optionen: ['Eigentümerversammlung', 'Umlaufbeschluss', 'Gerichtliche Entscheidung'], vorgabe: 'Eigentümerversammlung' }),
      f('text', 'Wortlaut', 'lang', { pflicht: true }),
      f('ergebnis', 'Ergebnis', 'wahl', { optionen: ['Angenommen', 'Abgelehnt', 'Angefochten', 'Aufgehoben'], vorgabe: 'Angenommen' }),
      f('umgesetzt', 'Umgesetzt', 'ja'),
    ],
    spalten: ['objektId', 'datum', 'nummer', 'ergebnis', 'umgesetzt'],
    anzeige: (s) => `Beschluss ${s.nummer ?? ''} ${s.datum}`,
    leer: 'Beschlüsse der Eigentümergemeinschaft – und ob sie schon umgesetzt sind.',
  },
  versammlungen: {
    titel: 'Versammlungen (WEG)', einzahl: 'Versammlung', kreis: 'verwalten',
    felder: [
      objekt, f('datum', 'Termin', 'datum', { pflicht: true }), f('uhrzeit', 'Uhrzeit'), f('ort', 'Ort'),
      f('art', 'Art', 'wahl', { optionen: ['Ordentliche Eigentümerversammlung', 'Außerordentliche Versammlung', 'Beiratssitzung'], vorgabe: 'Ordentliche Eigentümerversammlung' }),
      f('eingeladen', 'Einladung verschickt am', 'datum', { hilfe: 'Die Ladungsfrist beträgt in der Regel drei Wochen.' }),
      f('tagesordnung', 'Tagesordnung', 'lang', { hilfe: 'Ein Punkt pro Zeile.' }), f('protokoll', 'Protokoll / Ergebnis', 'lang'),
    ],
    spalten: ['objektId', 'datum', 'art', 'eingeladen'],
    anzeige: (s) => `${s.art} ${s.datum}`,
    leer: 'Eigentümerversammlungen mit Einladung, Tagesordnung und Protokoll.',
  },
  dokumente: {
    titel: 'Dokumente', einzahl: 'Dokument', kreis: 'verwalten',
    felder: [
      objekt, f('titel', 'Dokument', 'text', { pflicht: true }),
      f('art', 'Art', 'wahl', { optionen: ['Mietvertrag', 'Übergabeprotokoll', 'Abrechnung', 'Rechnung', 'Versicherung', 'Wartungsnachweis', 'Energieausweis', 'Plan / Grundriss', 'Schriftverkehr', 'Protokoll', 'Sonstiges'], vorgabe: 'Sonstiges' }),
      f('datum', 'Datum', 'datum'), f('ablage', 'Ablageort oder Link', 'text', { hilfe: 'Wo liegt das Dokument? z. B. Ordner, Laufwerk oder Internetadresse.' }), f('notiz', 'Notiz'),
    ],
    spalten: ['objektId', 'titel', 'art', 'datum', 'ablage'],
    anzeige: (s) => s.titel,
    leer: 'Ein Register, das zeigt, welche Unterlagen es gibt und wo sie liegen.',
  },
  schluessel: {
    titel: 'Schlüssel', einzahl: 'Schlüssel', kreis: 'verwalten',
    felder: [objekt, f('bezeichnung', 'Schlüssel', 'text', { pflicht: true }), f('anzahl', 'Anzahl', 'zahl', { vorgabe: 1 }), f('bei', 'Ausgegeben an'), f('datum', 'Ausgegeben am', 'datum'), f('notiz', 'Notiz')],
    spalten: ['objektId', 'bezeichnung', 'anzahl', 'bei', 'datum'],
    anzeige: (s) => s.bezeichnung,
    leer: 'Wer hat welchen Schlüssel?',
  },

  /* ---------------- Kreis 2 · Betreuen ---------------- */
  service: {
    titel: 'Serviceplan', einzahl: 'Serviceleistung', kreis: 'betreuen',
    felder: [
      objekt, f('leistung', 'Leistung', 'wahl', { optionen: SERVICELEISTUNGEN, pflicht: true }),
      f('rhythmus', 'Rhythmus', 'wahl', { optionen: ['Wöchentlich', '14-tägig', 'Monatlich', 'Vierteljährlich', 'Jährlich', 'Nach Bedarf'], vorgabe: 'Wöchentlich' }),
      f('naechster', 'Nächster Termin', 'datum', { pflicht: true }), f('wer', 'Zuständig'), f('notiz', 'Hinweise vor Ort', 'lang'),
    ],
    spalten: ['objektId', 'leistung', 'rhythmus', 'naechster', 'wer'],
    anzeige: (s) => `${s.leistung} · ${finde('objekte', s.objektId)?.bezeichnung ?? ''}`,
    leer: 'Wiederkehrende Dienste am Objekt: Mülltonnen, Winterdienst, Reinigung, Garten.',
  },
  einsaetze: {
    titel: 'Einsatznachweise', einzahl: 'Einsatz', kreis: 'betreuen',
    felder: [
      objekt, f('leistung', 'Leistung', 'wahl', { optionen: SERVICELEISTUNGEN, pflicht: true }),
      f('datum', 'Datum', 'datum', { pflicht: true }), f('uhrzeit', 'Uhrzeit', 'text', { hilfe: 'Beim Winterdienst wichtig als Nachweis.' }),
      f('wer', 'Ausgeführt von'), f('dauer', 'Dauer in Minuten', 'zahl'), f('notiz', 'Bemerkung', 'lang'),
    ],
    spalten: ['objektId', 'leistung', 'datum', 'uhrzeit', 'wer'],
    anzeige: (s) => `${s.leistung} ${s.datum}`,
    leer: 'Jeder erledigte Dienst wird hier festgehalten – der Nachweis gegenüber Eigentümer und Versicherung.',
  },
  vorgaenge: {
    titel: 'Meldungen & Schäden', einzahl: 'Meldung', kreis: 'betreuen',
    felder: [
      objekt, f('einheitId', 'Einheit', 'ref', { auf: 'einheiten' }),
      f('titel', 'Worum geht es?', 'text', { pflicht: true }),
      f('kategorie', 'Kategorie', 'wahl', { optionen: ['Schaden', 'Störung', 'Notfall', 'Beschwerde', 'Anfrage'], vorgabe: 'Schaden' }),
      f('status', 'Status', 'wahl', { optionen: ['Offen', 'In Arbeit', 'Wartet auf Dritte', 'Erledigt'], vorgabe: 'Offen' }),
      f('gemeldet', 'Gemeldet am', 'datum', { pflicht: true }), f('von', 'Gemeldet von'),
      f('firmaId', 'Beauftragte Firma', 'ref', { auf: 'firmen' }), f('kosten', 'Kosten', 'geld'),
      f('beschreibung', 'Beschreibung und Verlauf', 'lang'),
    ],
    spalten: ['objektId', 'titel', 'kategorie', 'status', 'gemeldet'],
    anzeige: (s) => s.titel,
    leer: 'Schäden, Störungen und Anfragen – von der Meldung bis zur Erledigung.',
  },

  /* ---------------- Kreis 3 · Erneuern ---------------- */
  auftraege: {
    titel: 'Renovierung & Sanierung', einzahl: 'Auftrag', kreis: 'erneuern',
    felder: [
      objekt, f('einheitId', 'Einheit', 'ref', { auf: 'einheiten' }),
      f('titel', 'Auftrag', 'text', { pflicht: true }), f('gewerk', 'Art der Arbeit', 'wahl', { optionen: GEWERKE, pflicht: true }),
      f('status', 'Status', 'wahl', { optionen: ['Anfrage', 'Angebot erstellt', 'Beauftragt', 'In Arbeit', 'Abnahme', 'Abgeschlossen'], vorgabe: 'Anfrage' }),
      f('start', 'Beginn', 'datum'), f('ende', 'Geplantes Ende', 'datum'),
      f('angebot', 'Angebotssumme', 'geld'), f('ist', 'Bisherige Kosten', 'geld'),
      f('leistungen', 'Leistungsumfang', 'lang', { hilfe: 'Eine Position pro Zeile.' }),
      f('maengel', 'Offene Mängel', 'lang'),
    ],
    spalten: ['objektId', 'titel', 'gewerk', 'status', 'ende', 'angebot'],
    anzeige: (s) => s.titel,
    leer: 'Arbeiten, die HaDie selbst ausführt: von der Anfrage über das Angebot bis zur Abnahme.',
  },

  /* ---------------- Kreis 4 · Entwickeln ---------------- */
  projekte: {
    titel: 'Großprojekte', einzahl: 'Projekt', kreis: 'entwickeln',
    felder: [
      objekt, f('titel', 'Projekt', 'text', { pflicht: true }),
      f('art', 'Art des Vorhabens', 'wahl', { optionen: ['Komplettsanierung', 'Fassadensanierung', 'Dachsanierung', 'Dachausbau / Aufstockung', 'Anbau / Rohbau', 'Heizungsumstellung', 'Aufzug', 'Balkonanbau', 'Brandschutz', 'Photovoltaik / Ladeinfrastruktur', 'Außenanlagen', 'Umnutzung', 'Sonstiges'], pflicht: true }),
      f('phase', 'Phase', 'wahl', { optionen: ['Idee', 'Analyse', 'Planung', 'Beschluss / Freigabe', 'Vergabe', 'Bauphase', 'Abnahme', 'Abgeschlossen'], vorgabe: 'Idee' }),
      f('budget', 'Budget', 'geld'), f('ist', 'Bisherige Kosten', 'geld'),
      f('start', 'Beginn', 'datum'), f('ziel', 'Geplante Fertigstellung', 'datum'),
      f('firmaId', 'Hauptauftragnehmer', 'ref', { auf: 'firmen' }),
      f('meilensteine', 'Meilensteine', 'lang', { hilfe: 'Ein Meilenstein pro Zeile.' }), f('notiz', 'Stand und Notizen', 'lang'),
    ],
    spalten: ['objektId', 'titel', 'art', 'phase', 'budget', 'ziel'],
    anzeige: (s) => s.titel,
    leer: 'Vorhaben am ganzen Gebäude, die Fachfirmen ausführen und HaDie steuert.',
  },

  vereinbarungen: {
    titel: 'Preisvereinbarungen', einzahl: 'Vereinbarung', kreis: 'basis',
    felder: [
      objekt, f('leistung', 'Leistung (Text auf der Rechnung)', 'text', { pflicht: true, hilfe: 'z. B. Verwaltervergütung, Mülltonnendienst' }),
      f('abrechnung', 'Abrechnung', 'wahl', { optionen: ['Monatlich pauschal', 'Je Einheit und Monat', 'Je dokumentiertem Einsatz'], pflicht: true, vorgabe: 'Monatlich pauschal' }),
      f('preis', 'Preis netto', 'geld', { pflicht: true }),
      f('einsatzLeistung', 'Gezählte Serviceleistung', 'wahl', { optionen: SERVICELEISTUNGEN, hilfe: 'Nur bei „Je dokumentiertem Einsatz“: Diese Einsätze werden im Monat gezählt.' }),
      f('aktiv', 'Wird abgerechnet', 'ja', { vorgabe: true }), f('notiz', 'Notiz'),
    ],
    spalten: ['objektId', 'leistung', 'abrechnung', 'preis', 'aktiv'],
    anzeige: (s) => s.leistung,
    leer: 'Was Sie mit dem Kunden je Objekt vereinbart haben. Daraus erzeugt der Rechnungslauf jeden Monat die Rechnungen.',
  },
  rechnungen: {
    titel: 'Rechnungen', einzahl: 'Rechnung', kreis: 'basis',
    felder: [
      f('nummer', 'Rechnungsnummer', 'text', { hilfe: 'Wird automatisch vergeben, sobald die Rechnung gestellt wird.' }),
      f('kundeId', 'Kunde', 'ref', { auf: 'kunden', pflicht: true }), f('objektId', 'Objekt', 'ref', { auf: 'objekte' }),
      f('datum', 'Rechnungsdatum', 'datum', { pflicht: true }), f('zeitraum', 'Leistungszeitraum', 'text', { hilfe: 'z. B. November 2026' }),
      f('positionen', 'Positionen', 'lang', { pflicht: true, hilfe: 'Eine Zeile je Position: Leistung | Menge | Einzelpreis netto. Beispiel: Mülltonnendienst | 4 | 12,00' }),
      f('ust', 'Umsatzsteuer in %', 'zahl', { vorgabe: 19, hilfe: '0 bei Kleinunternehmern oder steuerfreien Leistungen.' }),
      f('status', 'Status', 'wahl', { optionen: ['Entwurf', 'Offen', 'Bezahlt', 'Storniert'], vorgabe: 'Entwurf' }),
      f('faellig', 'Zahlbar bis', 'datum'), f('bezahltAm', 'Bezahlt am', 'datum'), f('notiz', 'Hinweis auf der Rechnung', 'lang'),
    ],
    spalten: ['nummer', 'kundeId', 'objektId', 'datum', 'status', 'faellig'],
    anzeige: (s) => s.nummer || 'Entwurf',
    leer: 'Ihre Rechnungen an Kunden. Am schnellsten entstehen sie über den Rechnungslauf.',
  },
  absender: {
    titel: 'Absender & Bank', einzahl: 'Absender', kreis: 'basis',
    felder: [
      f('name', 'Firmenname', 'text', { pflicht: true, vorgabe: 'HaDie-Immobilien' }), f('strasse', 'Straße und Hausnummer', 'text', { vorgabe: 'Detmolder Straße 142' }),
      f('ort', 'PLZ und Ort', 'text', { vorgabe: '33175 Bad Lippspringe' }), f('telefon', 'Telefon', 'text', { vorgabe: '0160 9500 6184' }), f('email', 'E-Mail'),
      f('inhaber', 'Kontoinhaber'), f('iban', 'IBAN'), f('bank', 'Bank'), f('gruss', 'Unterschrift (Name)'),
      f('steuernummer', 'Steuernummer', 'text', { hilfe: 'Auf Rechnungen ist die Steuernummer oder die USt-IdNr. Pflicht.' }), f('ustid', 'USt-IdNr.'),
      f('kleinunternehmer', 'Kleinunternehmer nach § 19 UStG (keine Umsatzsteuer)', 'ja'),
      f('zahlungsziel', 'Zahlungsziel in Tagen', 'zahl', { vorgabe: 14 }),
    ],
    spalten: ['name', 'ort', 'telefon', 'iban'],
    anzeige: (s) => s.name,
    leer: 'Diese Angaben erscheinen als Absender auf Schreiben, Angeboten und Berichten. Legen Sie genau einen Eintrag an.',
  },

  /* ---------------- Übergreifend ---------------- */
  aufgaben: {
    titel: 'Aufgaben', einzahl: 'Aufgabe', kreis: 'basis',
    felder: [f('titel', 'Aufgabe', 'text', { pflicht: true }), f('objektId', 'Objekt', 'ref', { auf: 'objekte' }), f('faellig', 'Fällig am', 'datum'), f('erledigt', 'Erledigt', 'ja'), f('notiz', 'Notiz', 'lang')],
    spalten: ['titel', 'objektId', 'faellig', 'erledigt'],
    anzeige: (s) => s.titel,
    leer: 'Alles, was sonst noch erledigt werden muss.',
  },
};

/** Welche Tabellen verweisen auf welche? (für das Mitlöschen verknüpfter Einträge) */
export function abhaengige(tabelle: string, id: string): { tabelle: string; ids: string[] }[] {
  const treffer: { tabelle: string; ids: string[] }[] = [];
  for (const [name, art] of Object.entries(ARTEN)) {
    const felder = art.felder.filter((x) => x.typ === 'ref' && x.auf === tabelle).map((x) => x.name);
    if (!felder.length) continue;
    const ids = alle(name).filter((s) => felder.some((feld) => s[feld] === id)).map((s) => s.id);
    if (ids.length) {
      treffer.push({ tabelle: name, ids });
      ids.forEach((kind) => treffer.push(...abhaengige(name, kind)));
    }
  }
  return treffer;
}
