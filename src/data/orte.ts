/**
 * EINSATZGEBIET: die zehn Städte und Gemeinden im Kreis Paderborn.
 * Jede Seite unter /hausverwaltung/<slug>/ wird hieraus erzeugt.
 * Nur gesicherte Angaben (Ortsteile, bekannte Merkmale) – keine Zahlen, keine Objektreferenzen.
 */
export type Ort = {
  slug: string;
  name: string;
  art: 'Stadt' | 'Gemeinde';
  ortsteile: string[];
  einleitung: string;
  absatz: string;
  schwerpunkte: string[];
};

export const orte: Ort[] = [
  {
    slug: 'paderborn',
    name: 'Paderborn',
    art: 'Stadt',
    ortsteile: ['Schloß Neuhaus', 'Elsen', 'Sande', 'Wewer', 'Marienloh', 'Benhausen', 'Neuenbeken', 'Dahl'],
    einleitung: 'Paderborn ist das Zentrum des Kreises – Universitätsstadt, Arbeitsort für viele und ein gefragter Wohnort. Entsprechend vielfältig ist der Bestand: vom Altbau in der Innenstadt über Mehrfamilienhäuser in den Stadtteilen bis zur vermieteten Eigentumswohnung.',
    absatz: 'In einer Universitätsstadt wechseln Mieter häufiger als anderswo. Jeder Wechsel heißt: Übergabe, Kaution, Renovierung, Neuvermietung. Genau hier spielt der 360°-Ansatz seine Stärke aus – Verwaltung und Renovierung aus einer Hand, ohne dass Sie zwischen Firmen koordinieren müssen.',
    schwerpunkte: ['Mieterwechsel zügig und sauber abwickeln', 'Renovierung zwischen zwei Mietern', 'Mehrfamilienhäuser und vermietete Eigentumswohnungen', 'Eigentümergemeinschaften'],
  },
  {
    slug: 'bad-lippspringe',
    name: 'Bad Lippspringe',
    art: 'Stadt',
    ortsteile: [],
    einleitung: 'Bad Lippspringe ist unser Zuhause: Hier sitzt HaDie-Immobilien. Die Stadt an den Quellen der Lippe ist als Kurort bekannt und verbindet ruhiges Wohnen mit kurzen Wegen nach Paderborn.',
    absatz: 'Für Eigentümer in Bad Lippspringe heißt das: Wir sind in wenigen Minuten vor Ort – zur Besichtigung, bei einem Schaden oder für den Kontrollgang. Kurze Wege sind für uns keine Floskel, sondern die Voraussetzung dafür, ein Haus wirklich zu betreuen.',
    schwerpunkte: ['Schnell vor Ort – unser Büro ist in der Stadt', 'Objektbetreuung und Hausmeisterdienste', 'Renovierung und Instandhaltung', 'Vermietete Häuser und Wohnungen'],
  },
  {
    slug: 'delbrueck',
    name: 'Delbrück',
    art: 'Stadt',
    ortsteile: ['Ostenland', 'Westenholz', 'Boke', 'Anreppen', 'Bentfeld', 'Hagen', 'Lippling', 'Schöning', 'Sudhagen', 'Steinhorst', 'Westerloh'],
    einleitung: 'Delbrück im Westen des Kreises ist geprägt von vielen Ortsteilen mit eigenem Charakter. Neben dem Stadtkern liegen viele Immobilien in den Dörfern – oft Einfamilien- und Mehrfamilienhäuser mit Garten und Außenanlagen.',
    absatz: 'Wo Häuser großzügige Grundstücke haben, fällt mehr an als die reine Verwaltung: Gartenpflege, Winterdienst, Mülltonnen, Kontrollgänge. Das alles übernehmen wir mit – und Sie haben einen Ansprechpartner statt mehrerer Dienstleister.',
    schwerpunkte: ['Gartenpflege und Winterdienst', 'Vermietete Häuser in den Ortsteilen', 'Kontrollgänge und Objektbetreuung', 'Renovierung und Modernisierung'],
  },
  {
    slug: 'salzkotten',
    name: 'Salzkotten',
    art: 'Stadt',
    ortsteile: ['Upsprunge', 'Verne', 'Scharmede', 'Thüle', 'Niederntudorf', 'Oberntudorf', 'Mantinghausen', 'Verlar', 'Holsen'],
    einleitung: 'Die Sälzerstadt Salzkotten liegt zwischen Paderborn und Geseke und wächst mit ihren Ortsteilen. Hier treffen ältere Bestandsgebäude auf neuere Wohngebiete.',
    absatz: 'Gerade ältere Häuser brauchen einen Blick fürs Technische: Heizung, Dach, Fenster, Feuchtigkeit. Wir verwalten nicht nur, wir erkennen auch, wann eine Erneuerung sinnvoll ist – und setzen sie auf Wunsch gleich mit um.',
    schwerpunkte: ['Bestandsgebäude erhalten und modernisieren', 'Mietverwaltung für einzelne Eigentümer', 'Energetische Maßnahmen begleiten', 'Objektservice rund ums Haus'],
  },
  {
    slug: 'bueren',
    name: 'Büren',
    art: 'Stadt',
    ortsteile: ['Steinhausen', 'Brenken', 'Wewelsburg', 'Ahden', 'Harth', 'Weiberg', 'Barkhausen', 'Hegensdorf', 'Siddinghausen', 'Weine'],
    einleitung: 'Büren im Südwesten des Kreises umfasst die Kernstadt und zahlreiche Ortsteile – darunter Wewelsburg und Ahden, wo der Flughafen Paderborn/Lippstadt liegt. Die Wege zwischen den Orten sind teils weit.',
    absatz: 'Für Eigentümer, die nicht selbst vor Ort wohnen, ist das eine Herausforderung: Wer schaut nach dem Haus, wer lässt den Handwerker herein? Wir übernehmen diese Rolle – mit regelmäßigen Kontrollgängen und klaren Absprachen. Den Stand sehen Sie jederzeit im Kundenbereich.',
    schwerpunkte: ['Betreuung für Eigentümer, die nicht vor Ort wohnen', 'Kontrollgänge und Leerstandskontrolle', 'Mietverwaltung', 'Reparaturen organisieren'],
  },
  {
    slug: 'hoevelhof',
    name: 'Hövelhof',
    art: 'Gemeinde',
    ortsteile: ['Espeln', 'Riege', 'Hövelriege'],
    einleitung: 'Hövelhof, die Sennegemeinde im Norden des Kreises, ist ein beliebter Wohnort im Grünen mit guter Anbindung. Viele Immobilien sind Ein- und Mehrfamilienhäuser in ruhigen Wohnlagen.',
    absatz: 'Ob Sie ein Haus vermieten oder eine Wohnung in einem kleineren Mehrfamilienhaus besitzen: Wir kümmern uns um Mieter, Abrechnung und alles, was am Gebäude anfällt – vom Rasenmähen bis zur Badsanierung.',
    schwerpunkte: ['Mietverwaltung für Häuser und Wohnungen', 'Garten- und Außenanlagen', 'Renovierung bei Mieterwechsel', 'Nebenkostenabrechnung'],
  },
  {
    slug: 'bad-wuennenberg',
    name: 'Bad Wünnenberg',
    art: 'Stadt',
    ortsteile: ['Haaren', 'Fürstenberg', 'Leiberg', 'Bleiwäsche', 'Helmern'],
    einleitung: 'Bad Wünnenberg im Süden des Kreises ist Kurort im Aatal und liegt eingebettet in viel Natur. Neben der Kernstadt gehören mehrere Ortsteile dazu.',
    absatz: 'In einer ländlich geprägten Stadt zählt vor allem eines: dass jemand zuverlässig hinschaut. Wir betreuen Ihr Objekt, auch wenn Sie selbst weiter weg wohnen – und sorgen dafür, dass Mieter einen Ansprechpartner haben und Schäden nicht liegen bleiben.',
    schwerpunkte: ['Betreuung aus der Ferne für Eigentümer', 'Mietverwaltung', 'Kontrollgänge und Winterdienst', 'Instandhaltung und Renovierung'],
  },
  {
    slug: 'lichtenau',
    name: 'Lichtenau',
    art: 'Stadt',
    ortsteile: ['Atteln', 'Dalheim', 'Kleinenberg', 'Herbram', 'Husen', 'Holtheim', 'Henglarn', 'Asseln', 'Grundsteinheim'],
    einleitung: 'Lichtenau im Südosten ist eine der flächengrößten Städte des Kreises – mit vielen Dörfern wie Atteln, Kleinenberg oder Dalheim mit seinem bekannten Kloster.',
    absatz: 'Weite Wege bedeuten: Ein Termin muss sitzen. Wir bündeln Besichtigungen, Ablesungen und Reparaturen, halten Fristen im Kalender und informieren Sie digital über den Stand – damit Ihr Haus gut betreut ist, auch wenn es nicht um die Ecke liegt.',
    schwerpunkte: ['Gebündelte Termine und klare Planung', 'Mietverwaltung für Häuser in den Ortsteilen', 'Wartungen und Fristen im Blick', 'Renovierung und Sanierung'],
  },
  {
    slug: 'altenbeken',
    name: 'Altenbeken',
    art: 'Gemeinde',
    ortsteile: ['Buke', 'Schwaney'],
    einleitung: 'Altenbeken liegt am Rand des Eggegebirges und ist weithin für seinen großen Eisenbahnviadukt bekannt. Zur Gemeinde gehören auch Buke und Schwaney.',
    absatz: 'Hanglage, viel Wald, Winter mit Schnee: Häuser in Altenbeken stellen eigene Anforderungen an Dach, Dachrinnen und Winterdienst. Wir behalten das im Blick und kümmern uns, bevor aus einer Kleinigkeit ein Schaden wird.',
    schwerpunkte: ['Winterdienst und Dachrinnenreinigung', 'Mietverwaltung', 'Kontrollgänge', 'Instandhaltung'],
  },
  {
    slug: 'borchen',
    name: 'Borchen',
    art: 'Gemeinde',
    ortsteile: ['Kirchborchen', 'Nordborchen', 'Etteln', 'Alfen', 'Dörenhagen'],
    einleitung: 'Borchen grenzt direkt an Paderborn und ist mit seinen Ortsteilen ein gefragter Wohnort für Familien. Viele Immobilien sind Einfamilienhäuser, Doppelhaushälften und kleinere Mehrfamilienhäuser.',
    absatz: 'Wer hier vermietet, hat oft langjährige Mieter – und ein Haus, das mit ihnen älter wird. Wir halten das Gebäude in Schuss, planen Erneuerungen rechtzeitig und sorgen für ordentliche Abrechnungen.',
    schwerpunkte: ['Mietverwaltung für Häuser und Wohnungen', 'Langfristige Instandhaltung planen', 'Modernisierung und Renovierung', 'Objektservice'],
  },
];
