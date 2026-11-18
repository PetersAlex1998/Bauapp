# Website HaDie-Immobilien

Statische Website für **HaDie-Immobilien – 360° Hausverwaltung**, Kreis Paderborn (Büro in Bad Lippspringe).
Gebaut mit [Astro](https://astro.build): Das Ergebnis sind reine HTML-/CSS-Dateien, die auf jedem Webspace laufen.

## Starten

```bash
npm install
npm run dev      # Vorschau unter http://localhost:4321
npm run build    # fertige Website im Ordner dist/
```

Den Inhalt von `dist/` auf den Webspace laden (oder das Repository mit Netlify, Vercel, Cloudflare Pages o. Ä. verbinden).

## Vorschau online stellen

> **Hinweis:** Die Netlify-Adresse leitet inzwischen dauerhaft auf `https://www.hadie-immobilien.de` um (Block `[[redirects]]` in `netlify.toml`). Für eine Netlify-Vorschau den Block entfernen.

Am schnellsten über Netlify (kostenlos für diesen Zweck): dort mit GitHub anmelden, „Add new
project → Import an existing project“, dieses Repository und den gewünschten Branch wählen,
„Deploy“. Die Einstellungen stehen bereits in `netlify.toml`. Jeder Push aktualisiert die Vorschau.

## Sicherheit und Vorschau-Schutz

- **Sicherheits-Header** stehen in `netlify.toml`: strenge Content-Security-Policy (nur eigene
  Skripte, Schriften und Bilder), HSTS, Schutz vor Einbettung in fremde Seiten u. a.
  Wird ein Formulardienst oder ein anderer externer Dienst angebunden, muss dessen Adresse in
  der Content-Security-Policy ergänzt werden, sonst blockiert der Browser ihn.
- **Passwortschutz:** In Netlify die Umgebungsvariable `VORSCHAU_PASSWORT` setzen und neu
  veröffentlichen. Der Browser fragt dann nach Benutzername (beliebig) und Passwort. Zum
  Livegang die Variable wieder löschen. Details: `netlify/edge-functions/vorschau-schutz.ts`.
- **Suchmaschinen** sind per `X-Robots-Tag` ausgesperrt. Diese Zeile in `netlify.toml` vor dem
  echten Livegang entfernen.
- Keine Fremdskripte. Logins und Daten des Verwaltertools liegen in der Datenbank bei STRATO (siehe unten).

## Inhalte ändern

| Was | Wo |
| --- | --- |
| Name, Adresse, Telefon, E-Mail, Bürozeiten, Region | `src/data/site.ts` |
| Die vier Leistungsbereiche (Texte, Reihenfolge, Unterseiten, Kreis) | `src/data/leistungen.ts` |
| Aufgabenkatalog: einzelne Leistungen je Bereich (aufklappbare Gruppen, Leistungssuche) | `src/data/leistungen.ts`, jeweils unter `katalog` – eine Zeile pro Leistung |
| Startseite | `src/pages/index.astro` |
| Über uns, Kontakt | `src/pages/ueber-uns.astro`, `src/pages/kontakt.astro` |
| Impressum, Datenschutz (Vorlagen) | `src/pages/impressum.astro`, `src/pages/datenschutz.astro` |
| Farben, Schriften, Abstände | `src/styles/global.css` (Variablen ganz oben) |
| Domain | `astro.config.mjs` (`DOMAIN`) |

Unternehmensdaten und Leistungen stehen nur an einer Stelle und erscheinen automatisch überall
(Kopf, Fuß, Kontakt, Impressum, Suchmaschinen-Daten, 360°-Kreis).

## Verwaltertool

Unter `/verwaltung/` liegt das Verwaltertool für alle vier Bereiche (Verwalten, Betreuen,
Erneuern, Entwickeln). Anmeldung über `/kundenlogin/` mit einer Nummer, die mit `V-` beginnt;
alle anderen Nummern führen in den Kundenbereich.

| Datei | Inhalt |
| --- | --- |
| `src/verwaltung/schema.ts` | Datenmodell: alle Datensatzarten mit Feldern. Ein neues Feld ist eine Zeile. |
| `src/verwaltung/speicher.ts` | Datenspeicher. **Einzige** Stelle, die Daten liest und schreibt. |
| `src/verwaltung/rechnen.ts` | Mieten, Rückstände, Nebenkostenabrechnung, 360°-Status. |
| `src/verwaltung/app.ts` | Oberfläche: Cockpit, Listen, Formulare, Objektseite, Tagesplan. |
| `src/verwaltung/ansichten2.ts` | Kalender, Kautionen, Eigentümerbericht, Schreiben (Erinnerung, Mahnung, Übergabeprotokoll), Angebot, Mieterwechsel-Assistent. Die Schreiben sind Vorlagen und vor dem Versand zu prüfen. |
| `src/verwaltung/beispiel.ts` | Erfundene Beispieldaten zum Ausprobieren. |

**Aufgaben** (`ansichten6.ts`): Jede Aufgabe gehört einer Person, hat Priorität, Bereich und optional eine
Wiederholung. „Meine Aufgaben“ gruppiert nach Fälligkeit und zeigt zugewiesene Meldungen mit. Neue Aufgaben
und Meldungen an einem Objekt gehen automatisch an dessen Objektbetreuer; bei einem Betreuerwechsel oder
einer Übergabe können offene Aufgaben und Meldungen mitgehen.

**Das Objekt ist die Arbeitseinheit.** Jedem Objekt sind ein Objektbetreuer und eine Vertretung
zugewiesen (`betreuerId`, `vertretungId`), nie einzelne Einheiten. Einheiten und Mieter liegen im
Arbeitsraum des Objekts. Die Ansicht oben (`ansicht.ts`) begrenzt alle Seiten auf „Meine Objekte“,
die eines Kollegen oder nicht zugewiesene – das ist eine Arbeitsansicht, **kein Zugriffsschutz**.
Team und Zuweisung: `ansichten5.ts`. Beim Löschen werden nur Pflicht-Verweise (z. B. Einheit →
Objekt) mitgelöscht; optionale Verweise (Firma, Betreuer, Kunde …) verlieren nur die Zuordnung.

Bankabgleich (CSV-Kontoauszug, Zuordnung der Mieten) und Eigentümerabrechnung (Monat/Jahr mit
Auszahlungsbetrag und Aufstellung für den Steuerberater) liegen in `ansichten3.ts`. Der Kontoauszug
wird nur im Browser gelesen.

Mieterhöhung nach § 558 BGB (Sperrfrist, Kappungsgrenze, Vergleichsmiete, Schreiben mit Fristen,
Übernahme nach Zustimmung in den Mietverlauf) liegt in `ansichten4.ts`; die Annahmen stehen im Kopf
der Datei. Das Tool ersetzt keine Rechtsprüfung der Begründung.

Rechnungen an Kunden: Preisvereinbarungen je Objekt, monatlicher Rechnungslauf und druckbare Rechnung
liegen ebenfalls in `ansichten2.ts`. Rechnungsnummern (`RE-Jahr-0001`) werden erst beim Stellen vergeben.
Das Tool erzeugt Rechnungen zum Drucken bzw. als PDF, keine elektronischen Rechnungen (XRechnung/ZUGFeRD).

**Betrieb:** Auf STRATO liegen die Daten in der Datenbank (Server-Modus, echte Anmeldung, Zugriffsschutz
je Rolle). Ohne Server – z. B. in der Netlify-Vorschau – läuft das Tool im Demo-Modus mit Daten nur im Browser.

## Kunden-Login und Kundenbereich

Eigentümer melden sich unter `/kundenlogin/` mit ihrer Kundennummer an (Zugänge legt die Verwaltung im
Tool unter *Stammdaten → Zugänge* an). Der Server liefert nur die eigenen Objekte, Rechnungen, Meldungen,
Arbeiten und Dokumente – keine Mieterdaten und keine internen Notizen. Ohne Server zeigt der Kundenbereich
nur einen Demo-Hinweis (`demoZugang` in `src/data/site.ts` gilt nur dort).

## «Direkt anrufen»

Der Knopf (`src/components/Anrufknopf.astro`) wählt auf Smartphones sofort und öffnet am
Computer ein Feld mit Nummer und Hinweisen. Die Nummer steht in `src/data/site.ts`.

## Bewegung (Scroll-Effekte)

Die Seite nutzt GSAP mit ScrollTrigger und Lenis (weiches Scrollen), lokal gebündelt, ohne CDN.
Alles dazu steht in `src/scripts/bewegung.ts`; Tempo über `DAUER` und `EASE` am Dateianfang.

- Vollbild-Hero mit Parallax-Ebenen im 360°-Kreis (Scroll und Maus)
- Bild, das sich beim Scrollen zur vollen Fläche öffnet (Startseite)
- Text, der Wort für Wort aufhellt; Einblendungen aller Abschnitte
- „magnetische“ Buttons (nur mit Maus)

Besucher mit der Systemeinstellung „Bewegung reduzieren“ und Browser ohne JavaScript sehen die
Seite vollständig, nur ohne Animation.

**Objektfoto:** Die gezeichnete Morgenszene auf der Startseite ist ein Platzhalter. Foto nach
`public/bilder/` legen und in `src/data/site.ts` unter `bilder.objekt` eintragen – es ersetzt
die Zeichnung automatisch (Querformat, mindestens 2400 px breit, als JPG oder WebP).

## Platzhalter

Fehlende Inhalte sind auf der Website als gestrichelte Kästen mit der Marke „Platzhalter“ sichtbar.
Im Code: `<Platzhalter>…</Platzhalter>`. Suche nach `Platzhalter` bzw. `PLATZHALTER` zeigt alle Stellen.

Vor dem Livegang:

1. Alle Platzhalter durch echte Inhalte ersetzen.
2. In `src/data/site.ts` `platzhalterAnzeigen: false` setzen (blendet Restliches aus).
3. Domain in `astro.config.mjs` eintragen.
4. Impressum und Datenschutzerklärung rechtlich prüfen lassen.

## Kontaktformular und Schadensmeldung

Beide Formulare (`/kontakt/`, `/schaden-melden/`) senden an die eigene Schnittstelle `/api/?a=anfrage`.
Die Nachricht wird in der Datenbank gespeichert (Tool → *Überblick → Website-Anfragen*, mit Kachel im Cockpit)
und zusätzlich per E-Mail an `KONTAKT_EMAIL` aus `.github/workflows/strato.yml` gemeldet. Spam-Falle und
Mengenbremse (5 Nachrichten je Absender in 15 Minuten) sind eingebaut.

## Datenschutz-Stand der Technik

- kein Tracking; ein technisch notwendiges Cookie nur nach dem Login, daher kein Cookie-Banner nötig
- Schriften (Fraunces, Instrument Sans) werden lokal ausgeliefert
- keine eingebetteten Karten oder Dienste Dritter; die Karte ist nur verlinkt

Wird später etwas davon geändert (Statistik, Kartenanzeige, Bewertungs-Widget), müssen
Datenschutzerklärung und ggf. Einwilligung angepasst werden.


## Auf STRATO veröffentlichen (automatisch)

Die Seite ist statisch (Astro). Zusätzlich liegt in `public/api/` eine kleine PHP-Schnittstelle (PHP 8 + MySQL/MariaDB), die Logins und die Daten des Verwaltertools speichert. Tabellen legt sie beim ersten Aufruf selbst an.

**Einmalig bei STRATO**
1. Domain dem Webspace/Paket zuordnen, HTTPS (SSL) aktivieren, PHP 8 einstellen.
2. Datenbank anlegen (Kundenservicebereich → Datenbanken). Notieren: Host, Datenbankname, Benutzer, Passwort.
3. SFTP/FTP-Zugang notieren (Host, Benutzer, Passwort, Zielordner der Domain).

**Einmalig bei GitHub** (Settings → Secrets and variables → Actions → New repository secret) – niemals in den Chat oder ins Repo:

| Secret | Inhalt |
|---|---|
| `SITE_URL` | z. B. `https://www.ihre-domain.de` |
| `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS` | Zugang der STRATO-Datenbank |
| `DB_TYP` | optional, Standard `mysql` |
| `EINRICHTUNGSCODE` | selbst gewählter langer Zufallscode (nur für die Ersteinrichtung) |
| `FTP_HOST`, `FTP_USER`, `FTP_PASS` | STRATO-Zugang |
| `FTP_VERZEICHNIS` | Zielordner der Domain, z. B. `/` oder `/ihre-domain` |
| `FTP_PROTOKOLL` | `sftp` (Standard) oder `ftp` (FTP mit TLS) |

**Danach läuft alles automatisch:** Jeder Push auf `main` baut die Seite, erzeugt `api/config.php` aus den Secrets, lädt per SFTP/FTPS hoch und prüft Seite und Datenbank (Workflow `.github/workflows/strato.yml`).

**Rollen:** Der Zugang aus der Einrichtung ist **Admin** (Inhaber). Nur Admins legen Zugänge der Verwaltung an, setzen deren Passwörter zurück, löschen sie und spielen Sicherungen ein. Mitarbeiter arbeiten normal und verwalten Kunden-Zugänge. Anmelde-Sperren gelten je Nummer und Gerät, damit Fremde niemanden aussperren können.

**Zwei-Faktor-Anmeldung:** Jeder Verwaltungs-Zugang kann unter *Stammdaten → Zugänge → Zwei-Faktor einrichten* eine Authenticator-App koppeln (TOTP nach RFC 6238, läuft vollständig auf dem eigenen Server). Danach braucht die Anmeldung zusätzlich den 6-stelligen Code; 10 einmalige Ersatzcodes helfen, wenn das Handy fehlt. Ein Admin kann die Zwei-Faktor-Anmeldung eines anderen Zugangs zurücksetzen.

**Erster Start:** `https://ihre-domain.de/einrichtung/` öffnen → Einrichtungscode, Verwaltungs-Nummer (`V-…`) und Passwort wählen. Weitere Mitarbeiter und Kunden legen Sie im Tool unter *Stammdaten → Zugänge* an. Danach den Secret `EINRICHTUNGSCODE` löschen oder ändern.

Ohne `/api` (z. B. Netlify-Vorschau) läuft das Tool im Demo-Modus; Daten bleiben dann nur im Browser.

## Vorschaubilder für WhatsApp, Facebook & Co.

Jede öffentliche Seite hat ein eigenes Vorschaubild unter `public/og/` (1200 × 630). Nach neuen Seiten oder geänderten Überschriften neu erzeugen und einchecken:

```
npm run build && npm run og && npm run build
```

Fehlt ein Bild, nimmt die Seite automatisch `public/og-bild.png`.

## Datensicherung (automatisch, jede Nacht)

Der Workflow `.github/workflows/sicherung.yml` holt jede Nacht alle Daten des Verwaltertools über
`/api/?a=sicherung`, verschlüsselt sie mit AES-256 und bewahrt sie **30 Tage** als Artifact des jeweiligen
Laufs auf (*Actions → Nächtliche Datensicherung → Lauf → Artifacts*). Schlägt ein Lauf fehl, schickt GitHub
eine E-Mail. Von Hand starten: *Actions → Nächtliche Datensicherung → Run workflow*.

**Einrichten (einmalig):** Secret `SICHERUNG_SCHLUESSEL` anlegen – ein langer Zufallswert (mind. 32 Zeichen),
den Sie **zusätzlich an einem sicheren Ort aufbewahren** (Passwort-Manager). Ohne ihn lassen sich die
Sicherungen nicht mehr öffnen. Danach einmal veröffentlichen (Push), damit der Server den Prüfwert kennt.

**Wiederherstellen:**
1. Gewünschte Sicherung (`hadie-sicherung-JJJJ-MM-TT`) herunterladen und entpacken.
2. Entschlüsseln, z. B. mit GnuPG: `gpg -d -o sicherung.json hadie-sicherung-JJJJ-MM-TT.json.gpg`
   (fragt nach dem Schlüssel). Unter Windows geht das mit Gpg4win, auf dem Mac mit GPG Suite.
3. Im Tool *Stammdaten → Daten & Sicherung → Sicherung einspielen* und `sicherung.json` wählen.
   Das ersetzt **alle** Daten in der Datenbank.
4. Die entschlüsselte Datei danach löschen – sie enthält personenbezogene Daten.

Die Sicherung enthält auch die Zugänge (nur Passwort-Prüfwerte, keine Klartext-Passwörter). Diese werden beim
Einspielen nicht verändert; fehlende Zugänge legen Sie im Tool neu an.
