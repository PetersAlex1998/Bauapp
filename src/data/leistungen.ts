/**
 * DIE VIER LEISTUNGSBEREICHE (= die vier Viertel des 360°-Kreises)
 * ---------------------------------------------------------------
 * Jeder Eintrag erzeugt automatisch:
 *   – ein Segment im 360°-Kreis
 *   – eine Karte auf der Startseite und der Leistungsübersicht
 *   – eine eigene Unterseite unter /leistungen/<slug>/
 *
 * Texte können hier frei geändert werden. Die Reihenfolge der
 * Einträge bestimmt die Position im Kreis (im Uhrzeigersinn).
 *
 * HINWEIS: Die Detailpunkte unter `umfang` beschreiben den üblichen
 * Inhalt des jeweiligen Bereichs und müssen von HADIE geprüft und
 * an das tatsächliche Angebot angepasst werden.
 */
export interface Leistung {
  slug: string;
  verb: string; // Ein-Wort-Beschriftung im Kreis
  titel: string;
  kurz: string; // Karte auf Start- und Übersichtsseite
  seoTitel: string;
  seoBeschreibung: string;
  einleitung: string;
  umfang: { titel: string; text: string }[];
  zusammenspiel: string; // Wie der Bereich mit den anderen zusammenhängt
  platzhalter?: string; // Offener Punkt, der auf der Seite markiert wird
}

export const leistungen: Leistung[] = [
  {
    slug: 'hausverwaltung',
    verb: 'Verwalten',
    titel: 'Klassische Hausverwaltung',
    kurz: 'Das Fundament: Ihre Immobilie kaufmännisch, technisch und organisatorisch in Ordnung – für Eigentümergemeinschaften und Mietobjekte.',
    seoTitel: 'Hausverwaltung im Kreis Paderborn',
    seoBeschreibung:
      'Klassische Hausverwaltung für Eigentümer und Eigentümergemeinschaften im Kreis Paderborn – als Teil der 360° Hausverwaltung von HADIE Immobilien.',
    einleitung:
      'Abrechnungen, die stimmen. Unterlagen, die vollständig sind. Ein Gebäude, bei dem jemand hinschaut. Die klassische Hausverwaltung ist das Fundament unserer Arbeit – und der Punkt, an dem bei HADIE alles Weitere zusammenläuft.',
    umfang: [
      {
        titel: 'Kaufmännisch',
        text: 'Abrechnungen, Zahlungsverkehr und Buchhaltung rund um Ihre Immobilie – nachvollziehbar und geordnet.',
      },
      {
        titel: 'Technisch',
        text: 'Wir behalten den Zustand des Gebäudes im Blick, veranlassen Wartungen und Reparaturen und kümmern uns darum, dass sie auch erledigt werden.',
      },
      {
        titel: 'Organisatorisch',
        text: 'Ansprechpartner für Eigentümer, Mieter und Dienstleister. Bei Eigentümergemeinschaften gehören Versammlungen und die Umsetzung der Beschlüsse dazu.',
      },
    ],
    zusammenspiel:
      'Weil wir Ihr Gebäude aus der Verwaltung kennen, wissen wir früh, was ansteht – ob im Alltag am Objekt, bei einer Renovierung oder bei einem größeren Vorhaben. Sie müssen niemandem erst erklären, worum es geht.',
    platzhalter:
      'Genauer Leistungsumfang der Verwaltung (z. B. WEG-Verwaltung, Mietverwaltung, Sondereigentumsverwaltung) – bitte von HADIE bestätigen und ergänzen.',
  },
  {
    slug: 'objektservice',
    verb: 'Betreuen',
    titel: 'Service rund ums Objekt',
    kurz: 'Der Alltag: Dienstleistungen wie der Mülltonnendienst, die niemandem auffallen – solange sie zuverlässig erledigt werden.',
    seoTitel: 'Objektservice & Mülltonnendienst im Kreis Paderborn',
    seoBeschreibung:
      'Alltägliche Dienstleistungen rund um Ihre Immobilie, etwa der Mülltonnendienst – direkt von Ihrer Hausverwaltung HADIE Immobilien im Kreis Paderborn.',
    einleitung:
      'Eine Immobilie zeigt im Alltag, wie gut sie betreut wird. Stehen die Tonnen rechtzeitig an der Straße? Kümmert sich jemand, bevor aus einer Kleinigkeit ein Ärgernis wird? Genau diese Aufgaben übernehmen wir gleich mit.',
    umfang: [
      {
        titel: 'Mülltonnendienst',
        text: 'Wir stellen die Tonnen zur Abholung bereit und räumen sie wieder zurück. Ihre Bewohner müssen an nichts denken.',
      },
      {
        titel: 'Kurze Wege',
        text: 'Verwaltung und Service kommen aus einer Hand. Was am Objekt auffällt, landet direkt bei uns – ohne Umweg über Dritte.',
      },
      {
        titel: 'Ein Ansprechpartner',
        text: 'Sie beauftragen nicht mehrere Firmen und gleichen deren Arbeit ab. Sie sagen uns, was Ihre Immobilie braucht.',
      },
    ],
    zusammenspiel:
      'Wer regelmäßig am Objekt ist, sieht mehr als jede Akte. Was uns im Alltag auffällt, fließt in die Verwaltung ein – und wird erledigt, solange es noch klein ist.',
    platzhalter:
      'Weitere alltägliche Dienstleistungen neben dem Mülltonnendienst (z. B. Winterdienst, Treppenhausreinigung, Gartenpflege, Hausmeisterdienste) – bitte von HADIE benennen.',
  },
  {
    slug: 'renovierung-sanierung',
    verb: 'Erneuern',
    titel: 'Renovierung & Sanierung',
    kurz: 'Der Bestand: Wohnungen und Gebäudeteile wieder in einen Zustand bringen, der sich gut vermietet und seinen Wert behält.',
    seoTitel: 'Renovierung & Sanierung von Beständen – Raum Paderborn',
    seoBeschreibung:
      'Renovierung und Sanierung von Wohnungen und Beständen im Kreis Paderborn – organisiert von Ihrer Hausverwaltung HADIE Immobilien.',
    einleitung:
      'Irgendwann reicht Instandhalten nicht mehr. Eine Wohnung wird frei und braucht mehr als frische Farbe, ein Bestand ist in die Jahre gekommen. Wir kümmern uns um Renovierung und Sanierung – damit Sie nicht zum Bauleiter werden müssen.',
    umfang: [
      {
        titel: 'Bedarf klären',
        text: 'Was ist nötig, was ist sinnvoll, was kann warten? Wir schauen uns den Bestand an und besprechen mit Ihnen den Rahmen.',
      },
      {
        titel: 'Umsetzung steuern',
        text: 'Wir koordinieren die Arbeiten und sind Ihr Ansprechpartner von der ersten Besichtigung bis zur Abnahme.',
      },
      {
        titel: 'Ergebnis übergeben',
        text: 'Am Ende steht eine Wohnung oder ein Gebäudeteil, der wieder genutzt und vermietet werden kann – und in der Verwaltung sauber dokumentiert ist.',
      },
    ],
    zusammenspiel:
      'Eine Renovierung endet bei uns nicht mit der Schlussrechnung. Was erneuert wurde, kennen wir anschließend auch in der Verwaltung – das macht spätere Entscheidungen einfacher.',
    platzhalter:
      'Konkrete Angaben zu Renovierung und Sanierung (typische Maßnahmen, eigene Ausführung oder Zusammenarbeit mit Partnerbetrieben) sowie Vorher-/Nachher-Fotos – bitte von HADIE liefern.',
  },
  {
    slug: 'projektbegleitung',
    verb: 'Entwickeln',
    titel: 'Begleitung großer Projekte',
    kurz: 'Das Ganze: Vorhaben, die das gesamte Gebäude betreffen, von der ersten Überlegung bis zum Abschluss an Ihrer Seite.',
    seoTitel: 'Projektbegleitung für Gebäude & Eigentümergemeinschaften',
    seoBeschreibung:
      'Begleitung großer Projekte am ganzen Gebäude für Eigentümer, Eigentümergemeinschaften und Investoren im Kreis Paderborn – HADIE Immobilien.',
    einleitung:
      'Manche Vorhaben betreffen nicht eine Wohnung, sondern das ganze Haus. Sie kosten viel, dauern lange und verlangen viele Entscheidungen. Wir begleiten solche Projekte – und sorgen dafür, dass Sie dabei den Überblick behalten.',
    umfang: [
      {
        titel: 'Vorbereiten',
        text: 'Wir ordnen das Vorhaben ein und bereiten die Grundlagen so auf, dass Sie – oder Ihre Eigentümergemeinschaft – gut entscheiden können.',
      },
      {
        titel: 'Begleiten',
        text: 'Während der Umsetzung sind wir Ihr Ansprechpartner, halten die Beteiligten zusammen und Sie auf dem Laufenden.',
      },
      {
        titel: 'Abschließen',
        text: 'Ein Projekt ist erst fertig, wenn es sauber abgeschlossen und in der laufenden Verwaltung angekommen ist.',
      },
    ],
    zusammenspiel:
      'Große Projekte gelingen leichter, wenn derjenige sie begleitet, der das Gebäude, die Eigentümer und die Zahlen ohnehin kennt. Hier schließt sich der Kreis.',
    platzhalter:
      'Beispiele für begleitete Projekte (Art des Vorhabens, Umfang, gern mit Fotos) – nur echte Projekte, bitte von HADIE liefern.',
  },
];

/** Gradbereich eines Viertels, z. B. «0°–90°» */
export function gradbereich(index: number): string {
  return `${index * 90}°–${(index + 1) * 90}°`;
}
