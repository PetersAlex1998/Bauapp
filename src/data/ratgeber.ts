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
  {
    slug: 'mieterhoehung-vergleichsmiete',
    titel: 'Mieterhöhung: So geht es richtig',
    seoTitel: 'Mieterhöhung auf die Vergleichsmiete: Fristen, Grenzen, Begründung',
    beschreibung: 'Wann dürfen Vermieter die Miete erhöhen, um wie viel – und wie muss das Schreiben aussehen? Mieterhöhung nach § 558 BGB und nach Modernisierung erklärt.',
    stand: '2026-11-18',
    einleitung:
      'Eine Mieterhöhung ist rechtlich anspruchsvoller, als viele denken. Schon ein Formfehler kann dazu führen, dass das Erhöhungsverlangen unwirksam ist. Die gute Nachricht: Wer die Regeln kennt, kann die Miete regelmäßig und sauber anpassen.',
    abschnitte: [
      {
        titel: 'Der Normalfall: Erhöhung auf die ortsübliche Vergleichsmiete',
        absaetze: [
          'Der Vermieter kann die Zustimmung zu einer Erhöhung bis zur ortsüblichen Vergleichsmiete verlangen (§ 558 BGB). Das ist die Miete, die in der Gemeinde für vergleichbare Wohnungen – nach Art, Größe, Ausstattung, Beschaffenheit und Lage – in den letzten Jahren vereinbart wurde.',
          'Haben Sie mit dem Mieter eine Staffel- oder Indexmiete vereinbart, gelten deren eigene Regeln; eine Erhöhung auf die Vergleichsmiete ist dann ausgeschlossen.',
        ],
      },
      {
        titel: 'Die Fristen',
        liste: [
          'Die Miete muss seit mindestens 15 Monaten unverändert sein, wenn die Erhöhung wirksam wird.',
          'Das Erhöhungsverlangen darf frühestens ein Jahr nach der letzten Erhöhung gestellt werden.',
          'Der Mieter hat bis zum Ende des zweiten Kalendermonats nach Zugang Zeit, zuzustimmen.',
          'Stimmt er zu, gilt die neue Miete ab Beginn des dritten Kalendermonats nach Zugang.',
        ],
        absaetze: [
          'Erhöhungen nach einer Modernisierung und wegen gestiegener Betriebskosten zählen bei diesen Fristen nicht mit.',
        ],
      },
      {
        titel: 'Die Grenze: Kappung',
        absaetze: [
          'Innerhalb von drei Jahren darf die Miete um höchstens 20 Prozent steigen – auch wenn die Vergleichsmiete höher liegt. In Gemeinden, in denen die Landesregierung eine angespannte Wohnungslage festgestellt hat, gilt eine Grenze von 15 Prozent. Welche Gemeinden das sind, regelt die jeweilige Landesverordnung; das sollte vor jeder Erhöhung geprüft werden.',
        ],
      },
      {
        titel: 'Das Schreiben',
        absaetze: ['Das Erhöhungsverlangen muss in Textform erfolgen und begründet werden. Als Begründung kommen in Frage:'],
        liste: [
          'ein Mietspiegel, wenn es für die Gemeinde einen gibt',
          'eine Auskunft aus einer Mietdatenbank',
          'ein Gutachten eines öffentlich bestellten und vereidigten Sachverständigen',
          'mindestens drei vergleichbare Wohnungen mit ihrer Miete',
        ],
      },
      {
        titel: 'Mieterhöhung nach Modernisierung',
        absaetze: [
          'Nach einer Modernisierung – etwa einer Wärmedämmung oder neuen Fenstern – darf der Vermieter die jährliche Miete um bis zu 8 Prozent der für die Wohnung aufgewendeten Kosten erhöhen (§ 559 BGB). Die monatliche Miete darf dadurch innerhalb von sechs Jahren aber um höchstens 3 Euro je Quadratmeter steigen, bei einer Miete unter 7 Euro je Quadratmeter um höchstens 2 Euro. Kosten für reine Instandhaltung zählen nicht dazu. Die Modernisierung muss vorher angekündigt werden.',
        ],
      },
      {
        titel: 'Tipp',
        absaetze: [
          'Behalten Sie den Mietverlauf jeder Wohnung im Blick: Wann wurde zuletzt erhöht, um wie viel, und wo liegt die Kappungsgrenze? Dann lassen sich Erhöhungen planen, statt sie zu vergessen.',
        ],
      },
    ],
    passendeLeistung: { text: 'Mietverwaltung: Mieten, Abrechnung und Mieterhöhungen', href: '/leistungen/hausverwaltung/' },
  },
  {
    slug: 'mietkaution-regeln',
    titel: 'Mietkaution: Höhe, Anlage und Rückzahlung',
    seoTitel: 'Mietkaution für Vermieter: Höhe, Anlage, Abrechnung',
    beschreibung: 'Wie hoch darf die Kaution sein, wie muss sie angelegt werden und wann ist sie zurückzuzahlen? Die Regeln zur Mietkaution im Überblick.',
    stand: '2026-11-18',
    einleitung:
      'Die Kaution sichert den Vermieter gegen offene Forderungen ab – etwa Schäden oder Nachzahlungen. Für Höhe, Zahlung und Anlage gelten klare gesetzliche Regeln (§ 551 BGB).',
    abschnitte: [
      {
        titel: 'Wie hoch darf die Kaution sein?',
        absaetze: [
          'Höchstens das Dreifache der monatlichen Miete ohne Betriebskosten, die als Pauschale oder Vorauszahlung ausgewiesen sind – also drei Nettokaltmieten.',
        ],
      },
      {
        titel: 'Zahlung in Raten',
        absaetze: [
          'Der Mieter darf die Kaution in drei gleichen monatlichen Raten zahlen. Die erste Rate ist zu Beginn des Mietverhältnisses fällig, die beiden weiteren mit den nächsten Mietzahlungen. Eine Vereinbarung, die das ausschließt, ist unwirksam.',
        ],
      },
      {
        titel: 'Getrennte Anlage',
        absaetze: [
          'Eine Barkaution muss der Vermieter getrennt von seinem eigenen Vermögen bei einem Kreditinstitut anlegen, grundsätzlich zum üblichen Zinssatz für Spareinlagen mit dreimonatiger Kündigungsfrist. Die Erträge stehen dem Mieter zu und erhöhen die Sicherheit. So bleibt die Kaution auch geschützt, wenn der Vermieter in Zahlungsschwierigkeiten gerät.',
        ],
      },
      {
        titel: 'Rückzahlung nach dem Auszug',
        absaetze: [
          'Die Kaution ist nicht sofort fällig. Der Vermieter darf sie eine angemessene Zeit behalten, um zu prüfen, ob noch Forderungen bestehen. Steht noch eine Betriebskostenabrechnung aus, darf er einen angemessenen Teil bis dahin einbehalten. Unstreitige Beträge sollten zügig ausgezahlt werden.',
          'Wichtig: Ersatzansprüche wegen Schäden an der Wohnung verjähren grundsätzlich sechs Monate nach Rückgabe (§ 548 BGB). Ein ausführliches Übergabeprotokoll ist deshalb entscheidend.',
        ],
      },
      {
        titel: 'Häufige Fehler',
        liste: [
          'Mehr als drei Nettokaltmieten verlangt',
          'Ratenzahlung verweigert',
          'Kaution auf dem eigenen Girokonto belassen statt getrennt angelegt',
          'Zinsen bei der Abrechnung vergessen',
          'Schäden nicht rechtzeitig geltend gemacht',
        ],
      },
    ],
    passendeLeistung: { text: 'Mietverwaltung: Kautionen verwalten und abrechnen', href: '/leistungen/hausverwaltung/' },
  },
  {
    slug: 'rauchwarnmelder-pflicht-nrw',
    titel: 'Rauchwarnmelder in NRW: Wer muss was tun?',
    seoTitel: 'Rauchwarnmelderpflicht NRW: Einbau, Wartung, Zuständigkeit',
    beschreibung: 'Wo müssen in Nordrhein-Westfalen Rauchwarnmelder hängen, wer baut sie ein und wer kümmert sich um die Wartung – Eigentümer oder Mieter?',
    stand: '2026-11-18',
    einleitung:
      'In Nordrhein-Westfalen sind Rauchwarnmelder in allen Wohnungen Pflicht. Die Regel steht in der Landesbauordnung (§ 47 Abs. 3 BauO NRW). Für Vermieter stellt sich vor allem eine Frage: Wer ist wofür verantwortlich?',
    abschnitte: [
      {
        titel: 'Wo müssen Rauchwarnmelder hängen?',
        liste: [
          'in Schlafräumen',
          'in Kinderzimmern',
          'in Fluren, über die Rettungswege von Aufenthaltsräumen führen',
        ],
        absaetze: ['Die Pflicht gilt für Neubauten und – nach Ablauf der Übergangsfrist Ende 2016 – auch für alle bestehenden Wohnungen.'],
      },
      {
        titel: 'Einbau: Sache des Eigentümers',
        absaetze: [
          'Für den Einbau ist der Eigentümer verantwortlich. Er muss die Geräte anbringen oder anbringen lassen – in der vermieteten Wohnung ebenso wie in der selbst genutzten.',
        ],
      },
      {
        titel: 'Wartung: grundsätzlich Sache der Bewohner',
        absaetze: [
          'Die Sicherstellung der Betriebsbereitschaft obliegt den unmittelbaren Besitzern, also in der Regel den Mietern – es sei denn, der Eigentümer übernimmt diese Pflicht selbst. Viele Vermieter tun das, zum Beispiel über einen Wartungsvertrag. Dann ist sichergestellt, dass die Geräte regelmäßig geprüft und Prüfungen dokumentiert werden.',
        ],
      },
      {
        titel: 'Worauf Vermieter achten sollten',
        liste: [
          'Geräte mit Prüfzeichen nach der einschlägigen Norm verwenden',
          'Einbau dokumentieren: welche Räume, welche Geräte, welches Datum',
          'Klar regeln, wer die Wartung übernimmt – am besten schriftlich',
          'Geräte mit fest eingebauter Langzeitbatterie sparen Aufwand',
          'Austauschtermine im Blick behalten, Geräte haben eine begrenzte Lebensdauer',
        ],
      },
      {
        titel: 'Kosten',
        absaetze: [
          'Die Anschaffung trägt der Eigentümer. Ob und wie Kosten für Miete oder Wartung von Rauchwarnmeldern als Betriebskosten auf Mieter umgelegt werden können, hängt vom Mietvertrag und der Art der Kosten ab – hier lohnt sich ein genauer Blick, denn die Rechtsprechung unterscheidet zwischen Wartung und Anmietung der Geräte.',
        ],
      },
    ],
    passendeLeistung: { text: 'Service rund ums Objekt: Fristen und Wartungen im Blick', href: '/leistungen/objektservice/' },
  },
];

export const datumText = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
