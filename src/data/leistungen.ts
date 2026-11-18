/**
 * DIE VIER LEISTUNGSBEREICHE (= die vier Viertel des 360°-Kreises)
 * ---------------------------------------------------------------
 * Jeder Eintrag erzeugt automatisch:
 *   – ein Segment im 360°-Kreis
 *   – eine Karte auf der Startseite und der Leistungsübersicht
 *   – eine eigene Unterseite unter /leistungen/<slug>/
 *   – die Einträge der Leistungssuche auf /leistungen/
 *
 * AUFGABENKATALOG: Unter `katalog` stehen die Gruppen eines Bereichs.
 * Jede Gruppe wird auf der Unterseite zu einem aufklappbaren Abschnitt.
 *   titel   – Überschrift der Gruppe
 *   kurz    – ein Satz, der auch zugeklappt sichtbar ist
 *   punkte  – die einzelnen Leistungen (eine Zeile pro Leistung)
 *   hinweis – optionaler Zusatz unter der Liste
 *
 * Leistung streichen: Zeile löschen. Leistung ergänzen: Zeile einfügen.
 * Die Reihenfolge der Bereiche bestimmt die Position im Kreis
 * (im Uhrzeigersinn), die Reihenfolge der Gruppen die auf der Seite.
 */
export interface Gruppe {
  titel: string;
  kurz: string;
  punkte: string[];
  hinweis?: string;
}

export interface Leistung {
  slug: string;
  verb: string; // Ein-Wort-Beschriftung im Kreis
  titel: string;
  kurz: string; // Karte auf Start- und Übersichtsseite
  seoTitel: string;
  seoBeschreibung: string;
  einleitung: string;
  umfang: { titel: string; text: string }[]; // «Auf einen Blick»
  katalog: Gruppe[];
  zusammenspiel: string; // Wie der Bereich mit den anderen zusammenhängt
  /** Fotos (Dateien in src/assets/bilder/), nur wo sie zum Bereich passen */
  bilder?: { datei: string; alt: string; text: string }[];
  platzhalter?: string; // Offener Punkt, der auf der Seite markiert wird
}

export const leistungen: Leistung[] = [
  /* ===================================================================
     KREIS 1 · VERWALTEN
     =================================================================== */
  {
    slug: 'hausverwaltung',
    verb: 'Verwalten',
    titel: 'Klassische Hausverwaltung',
    kurz: 'Das Fundament: Ihr Mietobjekt kaufmännisch, technisch und organisatorisch in Ordnung – auch für Eigentümergemeinschaften.',
    seoTitel: 'Hausverwaltung & Mietverwaltung im Kreis Paderborn',
    seoBeschreibung:
      'Mietverwaltung für Eigentümer und Verwaltung für Eigentümergemeinschaften im Kreis Paderborn: Abrechnung, Mieterbetreuung, Technik – als Teil der 360° Hausverwaltung von HaDie-Immobilien.',
    einleitung:
      'Abrechnungen, die stimmen. Mieter, die einen Ansprechpartner haben. Ein Gebäude, bei dem jemand hinschaut. Die klassische Hausverwaltung ist das Fundament unserer Arbeit – und der Punkt, an dem bei HaDie alles Weitere zusammenläuft.',
    umfang: [
      {
        titel: 'Kaufmännisch',
        text: 'Mieten, Abrechnungen, Zahlungsverkehr und Buchhaltung rund um Ihre Immobilie – nachvollziehbar und geordnet.',
      },
      {
        titel: 'Technisch',
        text: 'Wir behalten den Zustand des Gebäudes im Blick, überwachen Fristen und kümmern uns darum, dass Reparaturen auch erledigt werden.',
      },
      {
        titel: 'Organisatorisch',
        text: 'Ansprechpartner für Eigentümer, Mieter und Dienstleister. Für Eigentümergemeinschaften haben wir einen eigenen Ansprechpartner.',
      },
    ],
    katalog: [
      {
        titel: 'Mietverwaltung',
        kurz: 'Ihr Mietobjekt komplett betreut – vom neuen Mieter bis zur Übergabe.',
        punkte: [
          'Mietersuche: Exposé, Besichtigungen, Bonitätsprüfung',
          'Mietvertrag vorbereiten und abschließen',
          'Wohnungsübergabe und -abnahme mit Protokoll',
          'Mieterwechsel und Kündigungen abwickeln',
          'Fester Ansprechpartner für Ihre Mieter',
          'Beschwerden und Nachbarschaftskonflikte klären',
          'Mietanpassungen (Vergleichsmiete, Staffel, Index)',
          'Kautionen verwalten und abrechnen',
          'Mietrückstände verfolgen, Mahnwesen',
          'Untervermietung, Eigenbedarf, Mietminderung – bei Bedarf mit Anwalt',
        ],
      },
      {
        titel: 'Abrechnung & Buchhaltung',
        kurz: 'Zahlen, die stimmen und die Sie nachvollziehen können.',
        punkte: [
          'Mietenbuchhaltung',
          'Treuhandkonten, getrennt von unserem Vermögen',
          'Rechnungen prüfen und bezahlen',
          'Betriebskostenabrechnung (Nebenkosten)',
          'Heizkostenabrechnung mit dem Messdienst',
          'Auswertungen und Übersichten für Eigentümer',
          'Unterlagen für Ihren Steuerberater',
          'Bescheinigungen über haushaltsnahe Dienstleistungen (§ 35a EStG)',
        ],
      },
      {
        titel: 'Technische Verwaltung',
        kurz: 'Wir schauen hin, bevor aus einem Mangel ein Schaden wird.',
        punkte: [
          'Regelmäßige Begehungen des Objekts',
          'Mängel aufnehmen und nachverfolgen',
          'Instandhaltung planen',
          'Reparaturen beauftragen und überwachen',
          'Prüf- und Wartungsfristen überwachen: Heizung, Aufzug, Rauchwarnmelder',
          'Trinkwasserprüfung (Legionellen)',
          'Elektro, Brandschutz, Gasanlage, Schornstein',
          'Verkehrssicherung: Wege, Bäume, Spielplatz',
          'Energieausweis und gesetzliche Pflichten',
          'CO₂-Kostenaufteilung zwischen Vermieter und Mieter',
          'Gewährleistung nach Baumaßnahmen verfolgen',
        ],
      },
      {
        titel: 'Verträge & Versicherungen',
        kurz: 'Gute Konditionen, keine verpassten Fristen, schnelle Hilfe im Schadensfall.',
        punkte: [
          'Versorgerverträge (Strom, Gas, Wasser) verwalten',
          'Wartungs- und Dienstleistungsverträge verwalten',
          'Angebote einholen, vergleichen, verhandeln',
          'Kündigungsfristen im Blick behalten',
          'Gebäude- und Haftpflichtversicherung verwalten',
          'Schäden melden und mit der Versicherung abwickeln',
        ],
      },
      {
        titel: 'Eigentümergemeinschaften (WEG)',
        kurz: 'Mit eigenem Ansprechpartner für Ihre Gemeinschaft.',
        punkte: [
          'Wirtschaftsplan',
          'Jahresabrechnung und Vermögensbericht',
          'Erhaltungsrücklage verwalten',
          'Hausgeld einziehen, Mahnwesen',
          'Eigentümerversammlung: Einladung, Durchführung, Protokoll',
          'Umlaufbeschlüsse',
          'Beschluss-Sammlung führen',
          'Beschlüsse umsetzen',
          'Zusammenarbeit mit dem Verwaltungsbeirat',
          'Hausordnung',
          'Eigentümerwechsel begleiten',
          'Beschlussanfechtungen und Hausgeldklagen – mit Anwalt',
        ],
      },
      {
        titel: 'Einzelwohnungen & besondere Fälle',
        kurz: 'Auch wenn es nicht das klassische Mietshaus ist.',
        punkte: [
          'Verwaltung einzelner Eigentumswohnungen (Sondereigentum)',
          'Gemischt oder gewerblich genutzte Objekte',
          'Immobilien von Erbengemeinschaften',
          'Nachlassimmobilien',
        ],
      },
      {
        titel: 'Übernahme & Verwalterwechsel',
        kurz: 'Der Wechsel zu uns – ohne dass etwas liegen bleibt.',
        punkte: [
          'Bestandsaufnahme vor Ort',
          'Unterlagen vom bisherigen Verwalter übernehmen',
          'Verträge und Konten prüfen',
          'Konten und Vollmachten einrichten',
          'Mieter und Dienstleister informieren',
        ],
      },
      {
        titel: 'Beratung für Eigentümer',
        kurz: 'Eine ehrliche Einschätzung, bevor Sie entscheiden.',
        punkte: [
          'Einschätzung der erzielbaren Miete',
          'Einschätzung des Marktwerts',
          'Unterlagen für den Verkauf zusammenstellen',
          'Aufteilung in Eigentumswohnungen begleiten – mit Notar',
        ],
      },
    ],
    zusammenspiel:
      'Weil wir Ihr Gebäude aus der Verwaltung kennen, wissen wir früh, was ansteht – ob im Alltag am Objekt, bei einer Renovierung oder bei einem größeren Vorhaben. Sie müssen niemandem erst erklären, worum es geht.',
  },

  /* ===================================================================
     KREIS 2 · BETREUEN
     =================================================================== */
  {
    slug: 'objektservice',
    verb: 'Betreuen',
    titel: 'Service rund ums Objekt',
    kurz: 'Der Alltag: Hausmeister, Mülltonnen, Reinigung, Garten, Winterdienst – zuverlässig erledigt, ohne dass Sie daran denken müssen.',
    seoTitel: 'Hausmeisterservice, Winterdienst & Mülltonnendienst – Kreis Paderborn',
    seoBeschreibung:
      'Hausmeisterdienste, Mülltonnendienst, Reinigung, Gartenpflege und Winterdienst im Kreis Paderborn – direkt von Ihrer Hausverwaltung HaDie-Immobilien.',
    einleitung:
      'Eine Immobilie zeigt im Alltag, wie gut sie betreut wird. Stehen die Tonnen rechtzeitig an der Straße? Ist der Weg im Winter geräumt? Kümmert sich jemand, bevor aus einer Kleinigkeit ein Ärgernis wird? Genau diese Aufgaben übernehmen wir gleich mit.',
    umfang: [
      {
        titel: 'Rund ums Haus',
        text: 'Hausmeister, Mülltonnen, Reinigung, Garten und Winterdienst – regelmäßig und verlässlich.',
      },
      {
        titel: 'Technik & Notfälle',
        text: 'Wartungen im Blick, Störungen schnell behoben, Sofortmaßnahmen, wenn etwas passiert.',
      },
      {
        titel: 'Ein Ansprechpartner',
        text: 'Sie beauftragen nicht mehrere Firmen und gleichen deren Arbeit ab. Sie sagen uns, was Ihre Immobilie braucht.',
      },
    ],
    katalog: [
      {
        titel: 'Hausmeisterdienste',
        kurz: 'Jemand, der regelmäßig da ist und sich kümmert.',
        punkte: [
          'Regelmäßige Kontrollgänge',
          'Kleinreparaturen: Türen, Wasserhähne, Leuchtmittel',
          'Zähler ablesen',
          'Schlüssel und Schließanlagen verwalten',
          'Handwerker einweisen und beaufsichtigen',
          'Wohnungsübergaben unterstützen',
          'Gemeinschaftsräume, Waschküche, Fahrradkeller betreuen',
        ],
      },
      {
        titel: 'Müll & Entsorgung',
        kurz: 'Die Tonnen stehen rechtzeitig an der Straße – und danach wieder an ihrem Platz.',
        punkte: [
          'Mülltonnendienst: bereitstellen und zurückstellen',
          'Tonnen reinigen',
          'Müllplatz sauber halten',
          'Mülltrennung und Tonnengrößen optimieren',
          'Sperrmüll anmelden und bereitstellen',
          'Entrümpelung von Wohnungen, Kellern, Dachböden',
        ],
      },
      {
        titel: 'Reinigung',
        kurz: 'Ein sauberes Haus ist der erste Eindruck für jeden Mieter.',
        punkte: [
          'Treppenhausreinigung',
          'Keller, Waschküche, Tiefgarage',
          'Fenster und Glasflächen',
          'Aufzug',
          'Grundreinigung',
          'Endreinigung nach Auszug',
          'Graffiti entfernen',
        ],
      },
      {
        titel: 'Garten & Außenanlagen',
        kurz: 'Gepflegt vom Vorgarten bis zum Hof.',
        punkte: [
          'Rasen mähen',
          'Hecken und Sträucher schneiden',
          'Baumpflege und Baumkontrolle',
          'Laub beseitigen',
          'Wege und Pflasterflächen pflegen',
          'Spielplatz kontrollieren',
          'Dachrinnen reinigen',
          'Außenbeleuchtung und Zäune instand halten',
        ],
      },
      {
        titel: 'Winterdienst',
        kurz: 'Geräumt und gestreut, bevor jemand ausrutscht.',
        punkte: [
          'Schnee räumen',
          'Streuen bei Glätte',
          'Einsätze dokumentieren',
          'Räum- und Streupflicht nach örtlicher Satzung erfüllen',
        ],
      },
      {
        titel: 'Technik & Wartung',
        kurz: 'Damit Heizung, Aufzug und Wasser einfach funktionieren.',
        punkte: [
          'Wartungen organisieren: Heizung, Aufzug, Lüftung',
          'Rauchwarnmelder prüfen',
          'Legionellenprobe veranlassen',
          'Messdienst und Zählerwechsel koordinieren',
          'Rohrreinigung',
          'Schädlingsbekämpfung organisieren',
          'Schlüsseldienst',
        ],
      },
      {
        titel: 'Notfälle & Sofortmaßnahmen',
        kurz: 'Wenn etwas passiert, wissen Sie, wen Sie anrufen.',
        punkte: [
          'Störungen annehmen und beheben',
          'Sofortmaßnahmen bei Wasserschäden',
          'Sicherung nach Sturm- und Einbruchschäden',
          'Glasschäden',
          'Schaden für die Versicherung dokumentieren',
        ],
      },
      {
        titel: 'Betreuung bei Abwesenheit & Leerstand',
        kurz: 'Für Eigentümer, die nicht vor Ort sind.',
        punkte: [
          'Leerstehende Wohnungen kontrollieren',
          'Lüften, Heizen, Wasserleitungen spülen',
          'Betreuung für Eigentümer, die weiter weg wohnen',
          'Umzüge und Entrümpelungen organisieren',
          'Zutritt für Handwerker und Ableser ermöglichen',
        ],
      },
    ],
    zusammenspiel:
      'Wer regelmäßig am Objekt ist, sieht mehr als jede Akte. Was uns im Alltag auffällt, fließt in die Verwaltung ein – und wird erledigt, solange es noch klein ist.',
  },

  /* ===================================================================
     KREIS 3 · ERNEUERN
     =================================================================== */
  {
    slug: 'renovierung-sanierung',
    bilder: [
      { datei: 'renovierung-bad.jpg', alt: 'Helles, frisch renoviertes Bad mit Duschkabine, Badewanne, weißen Fliesen und Holzoptik-Boden', text: 'Bad mit Dusche und Wanne' },
      { datei: 'renovierung-wohnraum.jpg', alt: 'Leerer, renovierter Wohn- und Küchenbereich mit Fliesenspiegel, neuem Boden und Tür zum Balkon', text: 'Wohn- und Küchenbereich, bereit zur Vermietung' },
      { datei: 'renovierung-zimmer.jpg', alt: 'Renoviertes Zimmer mit neuen weißen Innentüren und hellem Boden', text: 'Neue Innentüren und Boden' },
      { datei: 'renovierung-dachterrasse.jpg', alt: 'Dachterrasse mit dunklem Dielenbelag und Geländer aus Edelstahl und Milchglas', text: 'Dachterrasse mit neuem Belag und Glasgeländer' },
    ],
    verb: 'Erneuern',
    titel: 'Renovierung & Sanierung',
    kurz: 'Der Bestand: Wir bringen Wohnungen und Gebäudeteile wieder in einen Zustand, der sich gut vermietet – und führen die Arbeiten selbst aus.',
    seoTitel: 'Renovierung & Sanierung von Mietwohnungen – Kreis Paderborn',
    seoBeschreibung:
      'Wohnungsrenovierung bei Mieterwechsel, Badsanierung, Maler- und Bodenarbeiten, energetische Sanierung im Kreis Paderborn – ausgeführt von Ihrer Hausverwaltung HaDie-Immobilien.',
    einleitung:
      'Irgendwann reicht Instandhalten nicht mehr. Eine Wohnung wird frei und braucht mehr als frische Farbe, ein Bestand ist in die Jahre gekommen. Wir renovieren und sanieren selbst – damit Sie nicht zum Bauleiter werden müssen.',
    umfang: [
      {
        titel: 'Bedarf klären',
        text: 'Was ist nötig, was ist sinnvoll, was kann warten? Wir schauen uns den Bestand an und besprechen mit Ihnen den Rahmen.',
      },
      {
        titel: 'Selbst ausführen',
        text: 'Wir führen die Arbeiten selbst aus und sind Ihr Ansprechpartner von der ersten Besichtigung bis zur Abnahme.',
      },
      {
        titel: 'Ergebnis übergeben',
        text: 'Am Ende steht eine Wohnung oder ein Gebäudeteil, der wieder genutzt und vermietet werden kann – und in der Verwaltung sauber dokumentiert ist.',
      },
    ],
    katalog: [
      {
        titel: 'Beratung & Planung',
        kurz: 'Erst verstehen, was das Gebäude braucht – dann anfangen.',
        punkte: [
          'Bestandsaufnahme und Zustandsanalyse',
          'Mängelliste mit Prioritäten',
          'Kostenschätzung und Budgetrahmen',
          'Fördermittel prüfen',
          'Energieberater und Gutachter vermitteln',
          'Prüfung auf Schadstoffe und Schimmel veranlassen',
          'Genehmigungen und Denkmalschutz – mit Architekt',
        ],
      },
      {
        titel: 'Wohnungsrenovierung bei Mieterwechsel',
        kurz: 'Aus einer abgewohnten Wohnung wird eine, die sich sofort wieder vermietet.',
        punkte: [
          'Malerarbeiten und Tapezieren',
          'Neue Bodenbeläge',
          'Türen und Zargen',
          'Bad und Küche auffrischen oder erneuern',
          'Elektro und Sanitär überprüfen und erneuern',
          'Entrümpelung und Endreinigung',
          'Modernisierung für die Neuvermietung',
          'Abnahme, Mängelfeststellung, Abrechnung mit der Kaution',
        ],
      },
      {
        titel: 'Innenausbau',
        kurz: 'Wände, Böden, Türen – sauber ausgeführt.',
        punkte: [
          'Maler- und Lackierarbeiten',
          'Trockenbau',
          'Putz- und Spachtelarbeiten',
          'Laminat, Vinyl, Parkett',
          'Fliesenarbeiten',
          'Innentüren',
          'Einbauten und Reparaturen',
        ],
      },
      {
        titel: 'Bad, Heizung & Elektro',
        kurz: 'Die Technik in der Wohnung auf heutigem Stand.',
        punkte: [
          'Badsanierung',
          'Sanitärinstallation',
          'Heizkörper und Heizungsleitungen',
          'Elektroinstallation, Steckdosen, Sicherungen',
          'Zähleranlage',
          'Leitungen erneuern: Trinkwasser, Abwasser, Steigstränge',
          'Kamerabefahrung von Abwasserleitungen',
        ],
      },
      {
        titel: 'Dach, Fassade & Fenster',
        kurz: 'Die Hülle des Hauses dicht und ansehnlich halten.',
        punkte: [
          'Dachreparaturen und Dachfenster',
          'Dachdämmung',
          'Fassadenanstrich und Putzausbesserung',
          'Fenster und Haustüren',
          'Balkone und Terrassen',
          'Schornstein',
        ],
        hinweis:
          'Sehr große Maßnahmen an der Gebäudehülle, etwa eine komplette Fassadensanierung, setzen wir mit Fachfirmen um und steuern sie für Sie – siehe „Begleitung großer Projekte“.',
      },
      {
        titel: 'Keller, Feuchtigkeit & Schimmel',
        kurz: 'Die Ursache finden und dauerhaft beheben.',
        punkte: [
          'Ursachen feststellen',
          'Kellerabdichtung und Trockenlegung',
          'Schimmelsanierung',
          'Lüftungskonzepte',
          'Schadstoffsanierung über Fachbetriebe',
        ],
      },
      {
        titel: 'Treppenhaus & Gemeinschaftsflächen',
        kurz: 'Der Bereich, den jeder Mieter und Besucher zuerst sieht.',
        punkte: [
          'Treppenhaus neu gestalten',
          'Briefkästen, Klingel- und Sprechanlage',
          'LED-Beleuchtung',
          'Eingangsbereich',
          'Garagen, Carports, Tiefgarage',
          'Außenanlagen und Müllplatz-Einhausung',
          'Aufzug modernisieren – mit Fachfirma',
        ],
      },
      {
        titel: 'Energetische Sanierung',
        kurz: 'Weniger Verbrauch, zukunftssicher vermietbar.',
        punkte: [
          'Dämmung von Dach, Fassade und Kellerdecke',
          'Neue Fenster',
          'Heizungstausch: Wärmepumpe, Fernwärme, Hybrid',
          'Hydraulischer Abgleich',
          'Photovoltaik, Mieterstrom, Speicher',
          'Wallboxen und Ladeinfrastruktur',
          'Lüftung mit Wärmerückgewinnung',
          'Funk-Heizkostenverteiler und moderne Zähler',
        ],
      },
      {
        titel: 'Barrieren abbauen',
        kurz: 'Damit Mieter lange in ihrer Wohnung bleiben können.',
        punkte: [
          'Rampen und Handläufe',
          'Treppenlifte',
          'Badumbau: bodengleiche Dusche',
          'Türen verbreitern',
          'Förderprogramme prüfen',
        ],
      },
      {
        titel: 'Schäden beheben',
        kurz: 'Nach Wasser, Feuer oder Sturm schnell wieder bewohnbar.',
        punkte: [
          'Wasserschadensanierung und Trocknung',
          'Brandschadensanierung',
          'Sturmschäden',
          'Abwicklung mit der Versicherung',
        ],
      },
      {
        titel: 'Ablauf & Abrechnung',
        kurz: 'Sie wissen jederzeit, was passiert und was es kostet.',
        punkte: [
          'Angebot mit klarem Leistungsumfang',
          'Terminplan',
          'Mieter rechtzeitig informieren, Modernisierung ankündigen',
          'Ein Ansprechpartner während der Arbeiten',
          'Abnahme und Mängelbeseitigung',
          'Gewährleistung',
          'Dokumentation mit Fotos',
          'Modernisierungsumlage und Mietanpassung berechnen',
          'Bescheinigungen für die Steuer (§ 35a EStG)',
        ],
      },
    ],
    zusammenspiel:
      'Eine Renovierung endet bei uns nicht mit der Schlussrechnung. Was erneuert wurde, kennen wir anschließend auch in der Verwaltung – das macht spätere Entscheidungen einfacher.',
    platzhalter: 'Vorher-/Nachher-Fotos echter Renovierungen – bitte von HaDie liefern.',
  },

  /* ===================================================================
     KREIS 4 · ENTWICKELN
     =================================================================== */
  {
    slug: 'projektbegleitung',
    verb: 'Entwickeln',
    titel: 'Begleitung großer Projekte',
    kurz: 'Das Ganze: Vorhaben, die das gesamte Gebäude betreffen – wir steuern die Fachfirmen, Sie behalten einen Ansprechpartner.',
    seoTitel: 'Projektsteuerung für Sanierung & Umbau – Kreis Paderborn',
    seoBeschreibung:
      'Begleitung großer Bauprojekte am ganzen Gebäude im Kreis Paderborn: Planung, Finanzierung, Steuerung der Fachfirmen, Abnahme – HaDie-Immobilien an der Seite von Eigentümern und Investoren.',
    einleitung:
      'Manche Vorhaben betreffen nicht eine Wohnung, sondern das ganze Haus: die Fassade, das Dach, ein Anbau. Solche Projekte setzen wir mit spezialisierten Fachfirmen um. Wir steuern sie für Sie – und sorgen dafür, dass Sie dabei den Überblick behalten.',
    umfang: [
      {
        titel: 'Vorbereiten',
        text: 'Wir ordnen das Vorhaben ein, rechnen es durch und bereiten die Grundlagen so auf, dass Sie gut entscheiden können.',
      },
      {
        titel: 'Steuern',
        text: 'Wir wählen die Fachfirmen mit Ihnen aus, halten Kosten und Termine im Blick und sind Ihr Ansprechpartner für alles.',
      },
      {
        titel: 'Abschließen',
        text: 'Ein Projekt ist erst fertig, wenn es abgenommen, abgerechnet und in der laufenden Verwaltung angekommen ist.',
      },
    ],
    katalog: [
      {
        titel: 'Strategie & Analyse',
        kurz: 'Lohnt es sich – und wenn ja, wie?',
        punkte: [
          'Analyse Ihres Bestands',
          'Wirtschaftlichkeitsrechnung',
          'Markt- und Lageeinschätzung',
          'Potenziale prüfen: Dachausbau, Aufstockung, Umnutzung',
          'Entscheidungshilfe: halten, sanieren oder verkaufen',
          'Planung von Einnahmen, Ausgaben und Rücklagen',
          'Energetischer Fahrplan für das Gebäude',
        ],
      },
      {
        titel: 'Große Baumaßnahmen',
        kurz: 'Vorhaben, die das ganze Gebäude verändern.',
        punkte: [
          'Komplettsanierung',
          'Fassadensanierung',
          'Dachsanierung',
          'Dachgeschossausbau und Aufstockung',
          'Anbau und Rohbauarbeiten',
          'Anbaubalkone',
          'Zentrale Heizungsumstellung',
          'Aufzug nachrüsten',
          'Tiefgaragensanierung',
          'Brandschutz nachrüsten',
          'Photovoltaik und Ladeinfrastruktur für das ganze Haus',
          'Barrierefreiheit im gesamten Gebäude',
          'Außenanlagen neu gestalten',
          'Umnutzung, zum Beispiel Gewerbe zu Wohnen',
          'Ersatzneubau',
        ],
        hinweis: 'Diese Arbeiten führen spezialisierte Fachfirmen aus. Wir steuern das Projekt für Sie.',
      },
      {
        titel: 'Projektsteuerung',
        kurz: 'Wir vertreten Ihre Interessen – vom ersten Plan bis zur Schlussrechnung.',
        punkte: [
          'Ziele, Kostenrahmen und Zeitplan festlegen',
          'Architekten und Fachplaner auswählen',
          'Genehmigungsverfahren begleiten',
          'Ausschreibung und Angebotsvergleich',
          'Vergabe an Fachfirmen',
          'Bauüberwachung und Qualitätskontrolle',
          'Kostenkontrolle und Nachträge prüfen',
          'Terminkontrolle',
          'Abnahme und Mängelverfolgung',
          'Gewährleistung',
          'Projektabrechnung und Abschlussbericht',
        ],
      },
      {
        titel: 'Finanzierung & Fördermittel',
        kurz: 'Damit das Vorhaben auch finanziell auf sicheren Füßen steht.',
        punkte: [
          'Unterlagen für die Bank vorbereiten',
          'Fördermittel finden und beantragen – mit Energieberater',
          'Steuerliche Fragen klären – mit Ihrem Steuerberater',
          'Rücklagen und Sonderumlagen planen',
        ],
      },
      {
        titel: 'Entscheidungen in der Eigentümergemeinschaft',
        kurz: 'Gut vorbereitete Beschlüsse, die anschließend auch umgesetzt werden.',
        punkte: [
          'Beschlüsse mit Angebotsvergleich vorbereiten',
          'Finanzierungsmodelle vorstellen',
          'Eigentümer informieren',
          'Versammlungen durchführen',
          'Verwaltungsbeirat einbinden',
          'Zwischen unterschiedlichen Interessen vermitteln',
        ],
      },
      {
        titel: 'Kommunikation mit Mietern & Nachbarn',
        kurz: 'Wer informiert ist, trägt ein Projekt eher mit.',
        punkte: [
          'Mieter frühzeitig informieren',
          'Ansprechpartner während der Bauzeit',
          'Härtefälle und Ausweichlösungen klären',
          'Abstimmung mit Nachbarn und Anwohnern',
        ],
      },
      {
        titel: 'Vermietung & Verkauf nach dem Projekt',
        kurz: 'Aus der Investition wird wieder Ertrag.',
        punkte: [
          'Neuvermietung nach der Sanierung',
          'Erstvermietung nach Ausbau oder Neubau',
          'Mietpreise festlegen',
          'Wertsteigerung dokumentieren',
          'Unterlagen für einen Verkauf zusammenstellen',
        ],
      },
      {
        titel: 'Besondere Fälle',
        kurz: 'Wenn es komplizierter wird.',
        punkte: [
          'Großschäden nach Feuer oder Wasser',
          'Abwicklung großer Schäden mit der Versicherung',
          'Denkmalgeschützte Gebäude',
          'Grundstücke im Erbbaurecht',
        ],
      },
    ],
    zusammenspiel:
      'Große Projekte gelingen leichter, wenn derjenige sie begleitet, der das Gebäude, die Eigentümer und die Zahlen ohnehin kennt. Hier schließt sich der Kreis.',
    platzhalter:
      'Beispiele für begleitete Projekte (Art des Vorhabens, Umfang, gern mit Fotos) – nur echte Projekte, bitte von HaDie liefern.',
  },
];

/** Gradbereich eines Viertels, z. B. «0°–90°» */
export function gradbereich(index: number): string {
  return `${index * 90}°–${(index + 1) * 90}°`;
}

/** Anker-Name einer Gruppe, z. B. «Müll & Entsorgung» → «muell-entsorgung» */
export function gruppenAnker(titel: string): string {
  return titel
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
