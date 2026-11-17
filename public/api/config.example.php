<?php
/**
 * Beispiel für die Konfiguration. Auf dem Server heißt die Datei config.php.
 * Beim automatischen Veröffentlichen (GitHub Actions) wird sie aus den
 * hinterlegten Geheimnissen erzeugt – Sie müssen sie dann nicht von Hand anlegen.
 * Diese Datei gehört NIE mit echten Zugangsdaten ins Repository.
 */
return [
    'db' => [
        'typ' => 'mysql',
        'host' => 'localhost',      // bei STRATO: Datenbank-Servername aus dem Kundenservice
        'name' => 'datenbankname',
        'user' => 'benutzername',
        'pass' => 'passwort',
    ],
    // Nur für die erste Einrichtung des Verwaltungs-Zugangs. Danach unwirksam.
    'einrichtungscode' => '',
    // Kontaktformular: an diese Adresse geht die Benachrichtigung über neue Anfragen.
    'kontakt_email' => '',
    // Optional: Absender der Benachrichtigung (eine Adresse Ihrer Domain).
    // 'absender_email' => 'website@ihre-domain.de',
];
