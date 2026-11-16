/**
 * BEISPIELDATEN zum Ausprobieren. Alle Namen und Zahlen sind erfunden.
 * Die Termine werden relativ zum heutigen Tag erzeugt, damit das Cockpit
 * immer etwas zu zeigen hat.
 */
import { heute, type Satz } from './speicher';
import { datumPlus, datumPlusMonate, monatHeute, monatPlus } from './rechnen';

export function beispieldaten(): Record<string, Satz[]> {
  const h = heute();
  const jahr = Number(h.slice(0, 4));
  const vorjahr = jahr - 1;
  const m0 = monatHeute();
  const zahlungen: Satz[] = [];
  const zahle = (mieterId: string, betrag: number, monate: number, auslassen = 0) => {
    for (let i = monate; i >= auslassen; i--) {
      const monat = monatPlus(m0, -i);
      zahlungen.push({ id: `z-${mieterId}-${monat}`, mieterId, monat, betrag, datum: `${monat}-03` });
    }
  };
  // Zahlungen seit Mietbeginn (Laufzeiten wie unten bei den Mietverhältnissen)
  zahle('m1', 780, 30);
  zahle('m2', 650, 20, 2); // zwei Monate im Rückstand
  zahle('m3', 915, 8);
  zahle('m4', 540, 40);

  const beleg = (id: string, objektId: string, kostenart: string, betrag: number, schluessel = 'Wohnfläche', umlage = true): Satz =>
    ({ id, objektId, datum: `${vorjahr}-06-15`, kostenart, betrag, schluessel, umlage });

  return {
    mitarbeiter: [
      { id: 'ma1', name: 'Beispiel Geschäftsführung', kuerzel: 'GF', rolle: 'Geschäftsführung', nummer: 'V-123456789', aktiv: true },
      { id: 'ma2', name: 'Beispiel Objektbetreuerin', kuerzel: 'OB', rolle: 'Objektbetreuer/in', aktiv: true },
      { id: 'ma3', name: 'Beispiel Hausmeister', kuerzel: 'HM', rolle: 'Hausmeister / Technik', aktiv: true },
    ],
    kunden: [
      { id: 'k1', kundennummer: '123456789', name: 'Beispiel Eigentümer', art: 'Eigentümer', ort: '33100 Paderborn', telefon: '', email: '' },
      { id: 'k2', kundennummer: '234567891', name: 'Beispiel-WEG Musterweg 12', art: 'Eigentümergemeinschaft', ort: '33175 Bad Lippspringe' },
    ],
    objekte: [
      { id: 'o1', bezeichnung: 'Beispielstraße 1', strasse: 'Beispielstraße 1', ort: '33100 Paderborn', art: 'Mietshaus', kundeId: 'k1', betreuerId: 'ma2', vertretungId: 'ma1', leistungen: ['Verwalten', 'Betreuen', 'Erneuern'], baujahr: 1978, mietspiegel: 'Mietspiegel (Beispiel)' },
      { id: 'o2', bezeichnung: 'Musterweg 12', strasse: 'Musterweg 12', ort: '33175 Bad Lippspringe', art: 'Eigentümergemeinschaft (WEG)', kundeId: 'k2', betreuerId: 'ma1', vertretungId: 'ma2', leistungen: ['Verwalten', 'Betreuen', 'Entwickeln'], baujahr: 1992 },
    ],
    einheiten: [
      { id: 'e1', objektId: 'o1', bezeichnung: 'Wohnung 1', lage: 'EG links', art: 'Wohnung', flaeche: 68, zimmer: 3, vergleichsmiete: 10.2 },
      { id: 'e2', objektId: 'o1', bezeichnung: 'Wohnung 2', lage: 'EG rechts', art: 'Wohnung', flaeche: 54, zimmer: 2, vergleichsmiete: 9.9 },
      { id: 'e3', objektId: 'o1', bezeichnung: 'Wohnung 3', lage: '1. OG links', art: 'Wohnung', flaeche: 82, zimmer: 4, vergleichsmiete: 9.6 },
      { id: 'e4', objektId: 'o1', bezeichnung: 'Wohnung 4', lage: '1. OG rechts', art: 'Wohnung', flaeche: 54, zimmer: 2 },
      { id: 'e5', objektId: 'o2', bezeichnung: 'Wohnung A', lage: 'EG', art: 'Wohnung', flaeche: 47, zimmer: 2, vergleichsmiete: 8.9 },
      { id: 'e6', objektId: 'o2', bezeichnung: 'Wohnung B', lage: '1. OG', art: 'Wohnung', flaeche: 75, zimmer: 3, vergleichsmiete: 9.8 },
    ],
    mieter: [
      { id: 'm1', einheitId: 'e1', name: 'Mieter Eins (Beispiel)', beginn: datumPlusMonate(h, -30).slice(0, 8) + '01', kaltmiete: 620, nebenkosten: 160, personen: 2, kautionSoll: 1860, kautionIst: 1860 },
      { id: 'm2', einheitId: 'e2', name: 'Mieter Zwei (Beispiel)', beginn: datumPlusMonate(h, -20).slice(0, 8) + '01', kaltmiete: 520, nebenkosten: 130, personen: 1, kautionSoll: 1560, kautionIst: 1000 },
      { id: 'm3', einheitId: 'e3', name: 'Mieter Drei (Beispiel)', beginn: datumPlusMonate(h, -8).slice(0, 8) + '01', kaltmiete: 730, nebenkosten: 185, personen: 4, kautionSoll: 2190, kautionIst: 2190 },
      { id: 'm4', einheitId: 'e5', name: 'Mieter Vier (Beispiel)', beginn: datumPlusMonate(h, -40).slice(0, 8) + '01', kaltmiete: 430, nebenkosten: 110, personen: 1, kautionSoll: 1290, kautionIst: 1290 },
    ],
    zahlungen,
    kosten: [
      beleg('b1', 'o1', 'Grundsteuer', 1240), beleg('b2', 'o1', 'Wasser', 1580, 'Personen'), beleg('b3', 'o1', 'Müllabfuhr', 760, 'Einheiten'),
      beleg('b4', 'o1', 'Versicherungen', 1320), beleg('b5', 'o1', 'Hausmeister', 1440), beleg('b6', 'o1', 'Winterdienst', 480),
      beleg('b7', 'o1', 'Heizung', 5260), beleg('b8', 'o1', 'Reparatur / Instandhaltung', 890, 'Wohnfläche', false),
    ],
    firmen: [
      { id: 'f1', name: 'Beispiel Heizungsbau', gewerk: 'Heizung / Sanitär', ansprechpartner: '', telefon: '' },
      { id: 'f2', name: 'Beispiel Fassadenbau', gewerk: 'Fassade / Gerüst' },
    ],
    fristen: [
      { id: 'fr1', objektId: 'o1', art: 'Heizungswartung', faellig: datumPlus(h, -5), intervall: 12, firmaId: 'f1' },
      { id: 'fr2', objektId: 'o1', art: 'Rauchwarnmelder', faellig: datumPlus(h, 18), intervall: 12 },
      { id: 'fr3', objektId: 'o2', art: 'Trinkwasserprüfung (Legionellen)', faellig: datumPlus(h, 75), intervall: 36 },
      { id: 'fr4', objektId: 'o1', art: 'Betriebskostenabrechnung', faellig: `${jahr}-12-31`, notiz: `Abrechnung ${vorjahr} muss den Mietern bis dahin zugehen.` },
    ],
    vertraege: [
      { id: 'v1', objektId: 'o1', art: 'Gebäudeversicherung', partner: 'Beispiel Versicherung', nummer: 'GV-000', kuendigenBis: datumPlus(h, 45), kosten: 1320 },
      { id: 'v2', objektId: 'o2', art: 'Wartungsvertrag', partner: 'Beispiel Heizungsbau', kosten: 380 },
    ],
    service: [
      { id: 's1', objektId: 'o1', leistung: 'Mülltonnendienst', rhythmus: 'Wöchentlich', naechster: h, wer: 'HaDie' },
      { id: 's2', objektId: 'o1', leistung: 'Treppenhausreinigung', rhythmus: 'Wöchentlich', naechster: datumPlus(h, 2), wer: 'HaDie' },
      { id: 's3', objektId: 'o2', leistung: 'Mülltonnendienst', rhythmus: '14-tägig', naechster: datumPlus(h, -1), wer: 'HaDie' },
      { id: 's4', objektId: 'o2', leistung: 'Gartenpflege', rhythmus: 'Monatlich', naechster: datumPlus(h, 9) },
      { id: 's5', objektId: 'o1', leistung: 'Winterdienst', rhythmus: 'Nach Bedarf', naechster: h, notiz: 'Gehweg und Zugang bis zur Haustür.' },
    ],
    einsaetze: [
      { id: 'en1', objektId: 'o1', leistung: 'Mülltonnendienst', datum: datumPlus(h, -7), uhrzeit: '06:40', wer: 'HaDie' },
      { id: 'en2', objektId: 'o1', leistung: 'Treppenhausreinigung', datum: datumPlus(h, -5), uhrzeit: '09:15', wer: 'HaDie', dauer: 50 },
    ],
    vorgaenge: [
      { id: 'vg1', objektId: 'o1', einheitId: 'e3', titel: 'Heizkörper im Bad wird nicht warm', zustaendigId: 'ma3', kategorie: 'Störung', status: 'In Arbeit', gemeldet: datumPlus(h, -3), von: 'Mieter Drei (Beispiel)', firmaId: 'f1' },
      { id: 'vg2', objektId: 'o2', titel: 'Außenleuchte am Eingang defekt', zustaendigId: 'ma1', kategorie: 'Schaden', status: 'Offen', gemeldet: datumPlus(h, -1) },
    ],
    auftraege: [
      { id: 'a1', objektId: 'o1', einheitId: 'e4', titel: 'Renovierung Wohnung 4 nach Auszug', gewerk: 'Wohnungsrenovierung', status: 'In Arbeit', start: datumPlus(h, -10), ende: datumPlus(h, 12), angebot: 8400, ist: 3150, leistungen: 'Malerarbeiten alle Räume\nNeuer Vinylboden 54 m²\nBad: Silikonfugen und Armaturen\nEndreinigung' },
    ],
    projekte: [
      { id: 'p1', objektId: 'o2', titel: 'Fassadensanierung mit Dämmung', art: 'Fassadensanierung', phase: 'Vergabe', budget: 148000, ist: 6200, start: datumPlus(h, 40), ziel: datumPlus(h, 190), firmaId: 'f2', meilensteine: 'Beschluss der Eigentümer liegt vor\nAngebote verglichen\nVergabe an Fachfirma\nGerüststellung\nAbnahme' },
    ],
    beschluesse: [
      { id: 'bs1', objektId: 'o2', datum: datumPlus(h, -60), nummer: `${jahr}/01`, art: 'Eigentümerversammlung', text: 'Die Fassade wird saniert und gedämmt. Die Verwaltung holt drei Angebote ein.', ergebnis: 'Angenommen', umgesetzt: false },
    ],
    aufgaben: [
      { id: 't1', titel: 'Nachmieter für Wohnung 4 suchen', objektId: 'o1', zustaendigId: 'ma2', faellig: datumPlus(h, 6), prioritaet: 'Hoch', bereich: 'Verwalten' },
      { id: 't2', titel: 'Angebot Gartenpflege einholen', objektId: 'o2', zustaendigId: 'ma1', faellig: datumPlus(h, -2), prioritaet: 'Normal', bereich: 'Betreuen' },
      { id: 't3', titel: 'Versicherungsschutz aller Objekte prüfen', zustaendigId: 'ma1', faellig: datumPlus(h, 20), prioritaet: 'Normal', bereich: 'Büro / Sonstiges', wiederholung: 'Jährlich' },
      { id: 't4', titel: 'Treppenhaus Beispielstraße 1 kontrollieren', objektId: 'o1', zustaendigId: 'ma3', faellig: h, prioritaet: 'Dringend', bereich: 'Betreuen', wiederholung: 'Wöchentlich' },
      { id: 't5', titel: 'Schlüsselübergabe Wohnung 3 dokumentieren', objektId: 'o1', zustaendigId: 'ma2', faellig: datumPlus(h, -9), prioritaet: 'Niedrig', bereich: 'Verwalten', erledigt: true, erledigtAm: datumPlus(h, -8) },
    ],
    vereinbarungen: [
      { id: 'pv1', objektId: 'o1', leistung: 'Verwaltervergütung', abrechnung: 'Je Einheit und Monat', preis: 28, aktiv: true },
      { id: 'pv2', objektId: 'o1', leistung: 'Mülltonnendienst', abrechnung: 'Je dokumentiertem Einsatz', preis: 12, einsatzLeistung: 'Mülltonnendienst', aktiv: true },
      { id: 'pv3', objektId: 'o1', leistung: 'Treppenhausreinigung', abrechnung: 'Monatlich pauschal', preis: 140, aktiv: true },
    ],
    mietaenderungen: [], mieterhoehungen: [], rechnungen: [], versammlungen: [], dokumente: [], absender: [],
    zaehler: [], schluessel: [],
  };
}
