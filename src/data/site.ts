/**
 * ZENTRALE UNTERNEHMENSDATEN
 * ---------------------------------------------------------------
 * Alles, was hier steht, erscheint automatisch überall auf der
 * Website (Kopfzeile, Fußzeile, Kontaktseite, Impressum,
 * Suchmaschinen-Daten). Änderungen bitte nur hier vornehmen.
 *
 * Felder mit `null` sind noch offen. Solange sie leer sind, zeigt
 * die Website an der Stelle einen gut sichtbaren Platzhalter.
 */
export const site = {
  name: 'HaDie-Immobilien',
  kurzname: 'HaDie',
  claim: '360° Hausverwaltung',
  gruendungsjahr: 2015,

  adresse: {
    strasse: 'Detmolder Straße 142',
    plz: '33175',
    ort: 'Bad Lippspringe',
  },

  telefon: {
    anzeige: '0160 9500 6184',
    link: '+4916095006184', // internationale Schreibweise für den Anruf-Link
  },

  // OFFEN – bitte ergänzen:
  email: null as string | null, // z. B. 'info@…'
  erreichbarkeit: 'Mo–Fr 8–17 Uhr' as string | null,

  // Orte für Texte und Suchmaschinen-Daten.
  // Das Tätigkeitsgebiet (Kreis Paderborn) steht so in allen Texten und Suchmaschinen-Daten.
  // Die Büroadresse in Bad Lippspringe bleibt davon unberührt (Kontakt, Impressum, Fußzeile).
  region: ['Kreis Paderborn'],
  regionText: 'Kreis Paderborn',

  /**
   * Kontaktformular: Adresse des Dienstes, der die Anfragen per E-Mail
   * zustellt (z. B. eigenes PHP-Skript beim Hoster, Formspree, Web3Forms).
   * Solange leer, ist das Formular sichtbar, aber deaktiviert.
   */
  formularEndpoint: '' as string,

  /**
   * Fotos. Datei in den Ordner `public/bilder/` legen und hier eintragen,
   * z. B. { src: '/bilder/objekt.jpg', alt: 'Mehrfamilienhaus im Kreis Paderborn' }.
   * Solange `null`, zeigt die Startseite eine gezeichnete Morgenszene.
   */
  bilder: {
    objekt: null as { src: string; alt: string } | null,
  },

  /**
   * Platzhalter-Hinweise (gestrichelte Kästen) ein-/ausblenden.
   * Vor dem Livegang: alle Platzhalter füllen, dann auf `false` stellen.
   */
  platzhalterAnzeigen: false,
};

/**
 * KUNDEN-LOGIN – ZUGANG ZUR DEMO
 * Das ist KEINE echte Anmeldung: Die Zugangsdaten stehen offen im Code der
 * Seite und jeder kann sie auslesen. Hinter dem Login dürfen deshalb nur
 * Beispieldaten liegen. Für echte Kundendaten braucht es einen Server mit
 * Benutzerverwaltung.
 */
export const demoZugang = {
  kundennummer: '123456789',
  passwort: '123456789',
};

export const navigation = [
  { text: 'Leistungen', href: '/leistungen/' },
  { text: 'Über uns', href: '/ueber-uns/' },
  { text: 'Kontakt', href: '/kontakt/' },
];
