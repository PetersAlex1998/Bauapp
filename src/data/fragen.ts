/**
 * HÄUFIGE FRAGEN (Startseite und Kontaktseite).
 * Nur Aussagen, die HaDie bestätigt hat – keine Preise, keine Reaktionszeiten.
 * Antworten sind einfacher Text; Absätze mit \n\n trennen.
 */
import { site } from './site';

export type Frage = { frage: string; antwort: string };

export const fragen: Frage[] = [
  {
    frage: 'Was kostet die Verwaltung meiner Immobilie?',
    antwort:
      'Das hängt von Ihrem Objekt ab: Anzahl der Einheiten, Zustand, und welche Leistungen Sie von uns möchten. Pauschalpreise aus dem Internet passen selten. Nach dem Kennenlernen erhalten Sie ein schriftliches Angebot mit klarem Leistungsumfang. Gespräch und Angebot sind für Sie unverbindlich.',
  },
  {
    frage: 'Muss ich alle vier Bereiche beauftragen?',
    antwort:
      'Nein. Sie können einen einzelnen Bereich beauftragen – etwa nur die Hausverwaltung oder nur den Service rund ums Objekt – oder den vollen Kreis. Viele starten mit einem Bereich und erweitern später.',
  },
  {
    frage: 'Wie läuft ein Wechsel von meiner bisherigen Verwaltung?',
    antwort:
      'Wir begleiten den Wechsel Schritt für Schritt: Bestandsaufnahme vor Ort, Übernahme der Unterlagen vom bisherigen Verwalter, Prüfung von Verträgen und Konten, Einrichtung von Konten und Vollmachten. Mieter und Dienstleister informieren wir über den Wechsel.\n\nWann Sie bei Ihrer bisherigen Verwaltung kündigen können, steht in deren Vertrag. Wir schauen uns die Fristen gemeinsam mit Ihnen an.',
  },
  {
    frage: 'Welche Unterlagen brauchen Sie von mir?',
    antwort:
      'Für den Start reicht, was Sie zur Hand haben: Mietverträge, die letzten Betriebskostenabrechnungen, Versicherungs- und Wartungsverträge, Pläne oder Grundrisse und eine Übersicht der Schlüssel. Was fehlt, besorgen wir gemeinsam – zum Beispiel beim bisherigen Verwalter.',
  },
  {
    frage: 'Verwalten Sie auch Eigentümergemeinschaften (WEG)?',
    antwort:
      'Ja. Unser Schwerpunkt sind vermietete Immobilien einzelner Eigentümer. Wir betreuen aber auch Eigentümergemeinschaften – mit Versammlung, Beschlüssen und Jahresabrechnung.',
  },
  {
    frage: 'In welcher Region sind Sie tätig?',
    antwort: `Im ${site.regionText}. Unser Büro ist in ${site.adresse.ort}. Wir sind in allen zehn Städten und Gemeinden für Sie da: Paderborn, Bad Lippspringe, Delbrück, Salzkotten, Büren, Hövelhof, Bad Wünnenberg, Lichtenau, Altenbeken und Borchen.`,
  },
  {
    frage: 'Wie behalte ich als Eigentümer den Überblick?',
    antwort:
      'Im Kundenbereich auf dieser Website sehen Sie Ihre Objekte, Rechnungen, gemeldete Schäden, laufende Arbeiten und Dokumente. Dort können Sie uns auch direkt eine Meldung schicken. Und natürlich erreichen Sie uns jederzeit persönlich.',
  },
  {
    frage: 'Was passiert, wenn in meinem Haus etwas kaputtgeht?',
    antwort: `Mieter und Eigentümer melden sich bei uns – telefonisch${site.erreichbarkeit ? ` (${site.erreichbarkeit})` : ''}, Mieter auch über die Seite „Schaden melden“ und Eigentümer über den Kundenbereich. Wir kümmern uns um die Reparatur und halten Sie auf dem Laufenden.\n\nBei akuter Gefahr – Gasgeruch, Feuer, Wasser, das nicht zu stoppen ist – zuerst den Notruf 112 oder den Störungsdienst des Versorgers anrufen.`,
  },
  {
    frage: 'Haben Sie die nötige Erlaubnis?',
    antwort:
      'Ja. HaDie-Immobilien verfügt über die gewerberechtliche Erlaubnis für Wohnimmobilienverwalter nach § 34c der Gewerbeordnung.',
  },
];
