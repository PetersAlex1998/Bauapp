# Website HADIE Immobilien

Statische Website für **HADIE Immobilien – 360° Hausverwaltung**, Bad Lippspringe.
Gebaut mit [Astro](https://astro.build): Das Ergebnis sind reine HTML-/CSS-Dateien, die auf jedem Webspace laufen.

## Starten

```bash
npm install
npm run dev      # Vorschau unter http://localhost:4321
npm run build    # fertige Website im Ordner dist/
```

Den Inhalt von `dist/` auf den Webspace laden (oder das Repository mit Netlify, Vercel, Cloudflare Pages o. Ä. verbinden).

## Inhalte ändern

| Was | Wo |
| --- | --- |
| Name, Adresse, Telefon, E-Mail, Bürozeiten, Region | `src/data/site.ts` |
| Die vier Leistungsbereiche (Texte, Reihenfolge, Unterseiten, Kreis) | `src/data/leistungen.ts` |
| Startseite | `src/pages/index.astro` |
| Über uns, Kontakt | `src/pages/ueber-uns.astro`, `src/pages/kontakt.astro` |
| Impressum, Datenschutz (Vorlagen) | `src/pages/impressum.astro`, `src/pages/datenschutz.astro` |
| Farben, Schriften, Abstände | `src/styles/global.css` (Variablen ganz oben) |
| Domain | `astro.config.mjs` (`DOMAIN`) |

Unternehmensdaten und Leistungen stehen nur an einer Stelle und erscheinen automatisch überall
(Kopf, Fuß, Kontakt, Impressum, Suchmaschinen-Daten, 360°-Kreis).

## Bewegung (Scroll-Effekte)

Die Seite nutzt GSAP mit ScrollTrigger und Lenis (weiches Scrollen), lokal gebündelt, ohne CDN.
Alles dazu steht in `src/scripts/bewegung.ts`; Tempo über `DAUER` und `EASE` am Dateianfang.

- Vollbild-Hero mit Parallax-Ebenen im 360°-Kreis (Scroll und Maus)
- Bild, das sich beim Scrollen zur vollen Fläche öffnet (Startseite)
- Text, der Wort für Wort aufhellt; Einblendungen aller Abschnitte
- Cursor-Ring und „magnetische“ Buttons (nur mit Maus)

Besucher mit der Systemeinstellung „Bewegung reduzieren“ und Browser ohne JavaScript sehen die
Seite vollständig, nur ohne Animation.

**Objektfoto:** Die gezeichnete Abendszene auf der Startseite ist ein Platzhalter. Foto nach
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
