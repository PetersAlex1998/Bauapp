/**
 * RATGEBER – kurze Fachartikel für Eigentümer.
 * Nur allgemeine, gesicherte Informationen; keine Rechtsberatung.
 * `stand` beim Überarbeiten aktualisieren.
 */
export type Abschnitt = { titel: string; absaetze?: string[]; liste?: string[] };
export type Artikel = {
  slug: string;
  titel: string;
  seoTitel: string;
  beschreibung: string;
  stand: string; // JJJJ-MM-TT
  einleitung: string;
  abschnitte: Abschnitt[];
  passendeLeistung?: { text: string; href: string };
};

export const artikel: Artikel[] = [
  {
    slug: 'mietverwaltung-oder-weg-verwaltung',
    titel: 'Mietverwaltung oder WEG-Verwaltung – was ist der Unterschied?',
    seoTitel: 'Mietverwaltung oder WEG-Verwaltung? Der Unterschied erklärt',
    beschreibung: 'Mietverwaltung, Sondereigentumsverwaltung, WEG-Verwaltung: Wer beauftragt wen, wofür ist wer zuständig – und was brauchen Sie als Eigentümer?',
    stand: '2026-11-17',
    einleitung:
      'Wer eine Immobilie besitzt, hört schnell drei Begriffe: Mietverwaltung, Sondereigentumsverwaltung und WEG-Verwaltung. Sie klingen ähnlich, meinen aber Unterschiedliches. Der wichtigste Unterschied: Für wen arbeitet die Verwaltung – für Sie allein oder für eine Gemeinschaft?',
    abschnitte: [
      {
        titel: 'Mietverwaltung: für Ihr vermietetes Haus',
        absaetze: [
          'Gehört Ihnen ein ganzes Haus, das Sie vermieten, beauftragen Sie eine Mietverwaltung. Sie arbeitet in Ihrem Auftrag und kümmert sich um alles, was mit den Mietern und dem Gebäude zu tun hat.',
        ],
        liste: [
          'Mieteingänge überwachen und bei Rückständen mahnen',
          'Betriebskostenabrechnung erstellen',
          'Ansprechpartner für Mieter sein, Schäden aufnehmen und Reparaturen beauftragen',
          'Mieterwechsel abwickeln: Übergabe, Kaution, Neuvermietung',
          'Verträge mit Dienstleistern und Versicherungen im Blick behalten',
        ],
      },
      {
        titel: 'WEG-Verwaltung: für die Gemeinschaft',
        absaetze: [
          'Ist ein Haus in Eigentumswohnungen aufgeteilt, bilden alle Eigentümer gemeinsam eine Wohnungseigentümergemeinschaft (WEG). Sie bestellt per Beschluss einen Verwalter. Dieser verwaltet das Gemeinschaftseigentum – also Dach, Fassade, Treppenhaus, Heizungsanlage, Außenanlagen – und ist der Gemeinschaft verpflichtet, nicht einem einzelnen Eigentümer.',
        ],
        liste: [
          'Eigentümerversammlung einberufen und leiten',
          'Beschlüsse umsetzen und die Beschlusssammlung führen',
          'Wirtschaftsplan und Jahresabrechnung erstellen',
          'Hausgeld einziehen und die Erhaltungsrücklage verwalten',
          'Instandhaltung des Gemeinschaftseigentums organisieren',
        ],
      },
      {
        titel: 'Sondereigentumsverwaltung: für Ihre vermietete Eigentumswohnung',
        absaetze: [
          'Die WEG-Verwaltung kümmert sich nicht um Ihre Mieter. Vermieten Sie eine Eigentumswohnung, brauchen Sie dafür eine eigene Verwaltung: die Sondereigentums- oder Mietverwaltung. Sie übernimmt für Ihre Wohnung dieselben Aufgaben wie die Mietverwaltung für ein ganzes Haus – und rechnet zum Beispiel die Kosten aus der WEG-Abrechnung gegenüber Ihrem Mieter ab.',
          'Beides kann in einer Hand liegen. Das spart Abstimmung, ist aber keine Pflicht.',
        ],
      },
      {
        titel: 'Was brauchen Sie?',
        liste: [
          'Ganzes Haus, vermietet: Mietverwaltung',
          'Eigentumswohnung, selbst bewohnt: nur die WEG-Verwaltung der Gemeinschaft',
          'Eigentumswohnung, vermietet: WEG-Verwaltung (über die Gemeinschaft) und zusätzlich eine Sondereigentumsverwaltung für Ihre Wohnung',
        ],
      },
    ],
    passendeLeistung: { text: 'Unsere klassische Hausverwaltung', href: '/leistungen/hausverwaltung/' },
  },
  {
    slug: 'betriebskostenabrechnung-fristen-fehler',
    titel: 'Betriebskostenabrechnung: Fristen, Regeln und häufige Fehler',
    seoTitel: 'Betriebskostenabrechnung: Fristen und häufige Fehler für Vermieter',
    beschreibung: 'Bis wann muss die Nebenkostenabrechnung beim Mieter sein? Welche Kosten dürfen umgelegt werden? Die wichtigsten Regeln für Vermieter auf einen Blick.',
    stand: '2026-11-17',
    einleitung:
      'Die Betriebskostenabrechnung – oft Nebenkostenabrechnung genannt – ist für viele Vermieter die lästigste Aufgabe des Jahres. Fehler kosten hier schnell bares Geld: Eine verspätete oder falsche Abrechnung kann dazu führen, dass Sie Nachzahlungen nicht mehr verlangen können.',
    abschnitte: [
      {
        titel: 'Die wichtigste Frist: zwölf Monate',
        absaetze: [
          'Der Abrechnungszeitraum darf höchstens zwölf Monate umfassen. Die Abrechnung muss dem Mieter spätestens zwölf Monate nach Ende dieses Zeitraums zugehen (§ 556 Abs. 3 BGB). Für das Jahr 2025 also bis zum 31. Dezember 2026.',
          'Kommt sie später, kann der Vermieter keine Nachzahlung mehr fordern – es sei denn, er hat die Verspätung nicht zu vertreten. Ein Guthaben des Mieters muss er trotzdem auszahlen. Entscheidend ist der Zugang beim Mieter, nicht das Absenden.',
        ],
      },
      {
        titel: 'Was darf umgelegt werden?',
        absaetze: [
          'Umlegen dürfen Sie nur Betriebskosten, die in der Betriebskostenverordnung genannt sind und deren Umlage im Mietvertrag vereinbart ist. Dazu gehören zum Beispiel Grundsteuer, Wasser und Abwasser, Heizung und Warmwasser, Müllabfuhr, Gebäudereinigung, Gartenpflege, Hausstrom, Schornsteinfeger, Gebäudeversicherungen und Hausmeister.',
        ],
      },
      {
        titel: 'Was nicht umgelegt werden darf',
        liste: [
          'Verwaltungskosten (z. B. die Vergütung der Hausverwaltung, Bank- und Portokosten)',
          'Instandhaltung und Reparaturen',
          'Rücklagen für spätere Maßnahmen',
          'Anteile des Hausmeisters, die auf Reparatur- oder Verwaltungsarbeiten entfallen',
        ],
      },
      {
        titel: 'Heizkosten: nach Verbrauch',
        absaetze: [
          'Heiz- und Warmwasserkosten müssen in der Regel zu einem großen Teil nach Verbrauch abgerechnet werden – die Heizkostenverordnung schreibt dafür 50 bis 70 Prozent vor. Seit 2023 werden zudem die CO₂-Kosten für Heizung und Warmwasser je nach Energieeffizienz des Gebäudes zwischen Vermieter und Mieter aufgeteilt.',
        ],
      },
      {
        titel: 'Häufige Fehler',
        liste: [
          'Abrechnung kommt zu spät beim Mieter an',
          'Kosten werden umgelegt, die im Mietvertrag nicht vereinbart sind',
          'Falscher Verteilerschlüssel oder falsche Flächenangaben',
          'Leerstand wird auf die übrigen Mieter verteilt, statt vom Vermieter getragen',
          'Vorauszahlungen des Mieters werden falsch oder gar nicht abgezogen',
          'Belege werden auf Nachfrage nicht vorgelegt – Mieter haben ein Recht auf Belegeinsicht',
        ],
      },
      {
        titel: 'Und der Mieter?',
        absaetze: [
          'Mieter können innerhalb von zwölf Monaten nach Zugang der Abrechnung Einwendungen erheben. Eine saubere, nachvollziehbare Abrechnung mit Belegen spart also nicht nur Zeit, sondern auch Streit.',
        ],
      },
    ],
    passendeLeistung: { text: 'Abrechnung & Buchhaltung in der Hausverwaltung', href: '/leistungen/hausverwaltung/' },
  },
  {
    slug: 'checkliste-mieterwechsel',
    titel: 'Checkliste Mieterwechsel: Auszug, Übergabe, Neuvermietung',
    seoTitel: 'Checkliste Mieterwechsel für Vermieter: Übergabe, Kaution, Neuvermietung',
    beschreibung: 'Was beim Auszug eines Mieters zu tun ist: Wohnungsübergabe, Zählerstände, Kaution, Renovierung und Neuvermietung – Schritt für Schritt.',
    stand: '2026-11-17',
    einleitung:
      'Ein Mieterwechsel ist mehr als ein Schlüsselwechsel. Wer strukturiert vorgeht, vermeidet Streit über Schäden und Kaution – und verkürzt den Leerstand.',
    abschnitte: [
      {
        titel: 'Vor dem Auszug',
        liste: [
          'Kündigung prüfen: Frist, Form, Datum des Mietendes',
          'Vorabbesichtigung vereinbaren, um nötige Arbeiten früh zu erkennen',
          'Mit der Vermarktung beginnen, wenn die Wohnung frei wird',
          'Termin für die Übergabe festlegen',
        ],
      },
      {
        titel: 'Die Übergabe',
        liste: [
          'Übergabeprotokoll Raum für Raum, mit Fotos',
          'Mängel und Schäden genau beschreiben und von beiden Seiten unterschreiben lassen',
          'Alle Zählerstände ablesen und notieren: Strom, Wasser, Heizung, Gas',
          'Schlüssel vollständig zurücknehmen und die Anzahl im Protokoll festhalten',
          'Neue Anschrift des Mieters für die Abrechnung aufnehmen',
        ],
      },
      {
        titel: 'Kaution und Abrechnung',
        absaetze: [
          'Die Kaution müssen Sie nicht sofort auszahlen. Der Vermieter darf sie für eine angemessene Zeit zurückhalten, um mögliche Ansprüche zu prüfen – etwa aus Schäden oder einer noch ausstehenden Betriebskostenabrechnung. Unstreitige Beträge sollten zügig abgerechnet werden.',
          'Ansprüche wegen Schäden an der Wohnung verjähren schnell: grundsätzlich sechs Monate nach Rückgabe der Wohnung (§ 548 BGB). Ein gutes Übergabeprotokoll ist deshalb Gold wert.',
        ],
      },
      {
        titel: 'Zwischen den Mietern',
        liste: [
          'Nötige Arbeiten beauftragen: Malerarbeiten, Boden, kleine Reparaturen',
          'Rauchwarnmelder und Anlagen prüfen',
          'Energieausweis bereithalten – er muss bei der Vermietung vorgelegt werden',
          'Miethöhe prüfen, auch mit Blick auf die örtlichen Regeln',
        ],
      },
      {
        titel: 'Der neue Mieter',
        liste: [
          'Mietvertrag mit vollständigen Angaben und Anlagen',
          'Kaution vereinbaren (höchstens drei Nettokaltmieten) und getrennt vom eigenen Vermögen anlegen',
          'Übergabeprotokoll beim Einzug, Zählerstände erneut notieren',
          'Wohnungsgeberbestätigung für die Anmeldung beim Bürgeramt ausstellen',
        ],
      },
    ],
    passendeLeistung: { text: 'Renovierung bei Mieterwechsel', href: '/leistungen/renovierung-sanierung/' },
  },
];

export const datumText = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
