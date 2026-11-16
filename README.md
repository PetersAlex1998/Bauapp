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
- Die Seite speichert keine Daten, hat keine Datenbank, kein Login und keine Fremdskripte.

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
| `src/verwaltung/beispiel.ts` | Erfundene Beispieldaten zum Ausprobieren. |

**Stand der Ausbaustufe:** Die Daten liegen im Browser des jeweiligen Geräts (localStorage),
die Anmeldung wird nur im Browser geprüft. Es gibt also noch keinen Server, keine gemeinsame
Datenbasis für mehrere Geräte und keinen echten Zugriffsschutz. Für den Mehrbenutzer-Betrieb
wird `speicher.ts` gegen eine Server-Anbindung getauscht; die übrigen Dateien bleiben gleich.
Bis dahin regelmäßig über „Daten & Sicherung“ sichern.

## Kunden-Login (Demo)

`/kundenlogin/` und `/kundenbereich/` sind eine **Vorschau ohne echte Anmeldung**. Die
Zugangsdaten stehen in `src/data/site.ts` (`demoZugang`) und damit offen im Code der Seite;
geprüft wird nur im Browser. Im Kundenbereich dürfen deshalb ausschließlich Beispieldaten
stehen. Für echte Kundendaten braucht es einen Server mit Benutzerverwaltung (Anmeldung,
verschlüsselte Passwörter, Zugriffsschutz für Dokumente).

## «Direkt anrufen»

Der Knopf (`src/components/Anrufknopf.astro`) wählt auf Smartphones sofort und öffnet am
Computer ein Feld mit Nummer und Hinweisen. Die Nummer steht in `src/data/site.ts`.

## Bewegung (Scroll-Effekte)

Die Seite nutzt GSAP mit ScrollTrigger und Lenis (weiches Scrollen), lokal gebündelt, ohne CDN.
Alles dazu steht in `src/scripts/bewegung.ts`; Tempo über `DAUER` und `EASE` am Dateianfang.

- Vollbild-Hero mit Parallax-Ebenen im 360°-Kreis (Scroll und Maus)
- Bild, das sich beim Scrollen zur vollen Fläche öffnet (Startseite)
- Text, der Wort für Wort aufhellt; Einblendungen aller Abschnitte
- Cursor-Ring und „magnetische“ Buttons (nur mit Maus)

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

## Kontaktformular

Eine statische Website kann selbst keine E-Mails versenden. Das Formular schickt die Daten per POST
an die Adresse in `formularEndpoint` (`src/data/site.ts`). Geeignet sind z. B. ein kleines PHP-Skript
beim eigenen Hoster oder ein Formulardienst mit Serverstandort in der EU. Solange das Feld leer ist,
bleibt das Formular sichtbar, aber deaktiviert. Der gewählte Dienst gehört in die Datenschutzerklärung.

## Datenschutz-Stand der Technik

- keine Cookies, kein Tracking, daher kein Cookie-Banner nötig
- Schriften (Fraunces, Instrument Sans) werden lokal ausgeliefert
- keine eingebetteten Karten oder Dienste Dritter; die Karte ist nur verlinkt

Wird später etwas davon geändert (Statistik, Kartenanzeige, Bewertungs-Widget), müssen
Datenschutzerklärung und ggf. Einwilligung angepasst werden.
