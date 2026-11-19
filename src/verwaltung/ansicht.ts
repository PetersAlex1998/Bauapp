/**
 * ZUSTÄNDIGKEIT UND ARBEITSANSICHT
 * ---------------------------------------------------------------
 * Das Objekt ist die Arbeitseinheit: Jedem Objekt sind ein
 * Objektbetreuer und eine Vertretung zugewiesen. Die Ansicht legt
 * fest, welche Objekte (und alles, was daran hängt) angezeigt werden:
 *   alle · meine · die eines Mitarbeiters · nicht zugewiesen
 *
 * WICHTIG: Das ist eine ARBEITSANSICHT, kein Zugriffsschutz. Wer das
 * Tool öffnet, kann jede Ansicht wählen. Echte Zugriffsbeschränkung je
 * Mitarbeiter gehört auf den Server (Datenbank) – die Zuweisung
 * `betreuerId` ist dafür die Grundlage.
 */
import { alle, finde, speichere, type Satz } from './speicher';
import { objektVonMieter } from './rechnen';

const KEY = 'hadie-ansicht';
export const nutzerNummer = () => (sessionStorage.getItem('hadie-verwaltung') ?? '').trim().toUpperCase();

/** Der Mitarbeiter, der zur angemeldeten Nummer gehört (Feld «Login-Nummer» beim Mitarbeiter). */
export const ich = (): Satz | undefined =>
  alle('mitarbeiter').find((m) => m.aktiv !== false && m.nummer && String(m.nummer).trim().toUpperCase() === nutzerNummer());

/** Gespeicherte Wahl: 'alle' | 'meine' | 'offen' | Mitarbeiter-ID */
export function ansichtWahl(): string {
  const gespeichert = localStorage.getItem(KEY);
  if (gespeichert) return gespeichert;
  const m = ich();
  return m && m.rolle !== 'Geschäftsführung' ? 'meine' : 'alle';
}
export const setzeAnsicht = (wahl: string) => localStorage.setItem(KEY, wahl);

/** Aufgelöste Ansicht: 'alle' | 'offen' | Mitarbeiter-ID */
export function ansichtId(): string {
  let w = ansichtWahl();
  if (w === 'meine') w = ich()?.id ?? 'alle';
  if (w !== 'alle' && w !== 'offen' && !finde('mitarbeiter', w)) w = 'alle';
  return w;
}

export const zustaendigFuer = (o: Satz, id: string) => o.betreuerId === id || o.vertretungId === id;

/** Objekte der aktuellen Ansicht; null bedeutet: alle. */
export function sichtbareObjektIds(): Set<string> | null {
  const w = ansichtId();
  if (w === 'alle') return null;
  return new Set(alle('objekte').filter((o) => (w === 'offen' ? !o.betreuerId : zustaendigFuer(o, w))).map((o) => o.id));
}

/** Zu welchem Objekt gehört ein Datensatz? */
export function objektIdVon(art: string, s: Satz): string | undefined {
  switch (art) {
    case 'objekte': return s.id;
    case 'mieter': return objektVonMieter(s);
    case 'zahlungen': case 'mietaenderungen': case 'mieterhoehungen': case 'kautionsbuchungen': {
      const m = finde('mieter', s.mieterId);
      return m ? objektVonMieter(m) : undefined;
    }
    case 'kunden': case 'firmen': case 'absender': case 'bankkonten': case 'mitarbeiter': return undefined;
    default: return s.objektId || undefined; // einheiten, kosten, fristen, service, vorgaenge, rechnungen …
  }
}

export function sichtbar(art: string, s: Satz): boolean {
  const ids = sichtbareObjektIds();
  if (!ids) return true;
  if (art === 'kunden') return alle('objekte').some((o) => o.kundeId === s.id && ids.has(o.id));
  const oid = objektIdVon(art, s);
  return oid === undefined ? true : ids.has(oid);
}

/** Datensätze einer Art, begrenzt auf die aktuelle Ansicht. */
export const ds = (art: string): Satz[] => alle(art).filter((s) => sichtbar(art, s));

export function ansichtBeschreibung(): string {
  const w = ansichtId();
  if (w === 'alle') return 'Alle Objekte';
  if (w === 'offen') return 'Nicht zugewiesene Objekte';
  const m = finde('mitarbeiter', w);
  return m && m.id === ich()?.id ? 'Meine Objekte' : `Objekte von ${m?.name ?? '?'}`;
}

/* ---------- Aufgaben und Meldungen folgen dem Objektbetreuer ---------- */
/** Wer bekommt eine neue Aufgabe oder Meldung? Der Betreuer des Objekts, sonst der Angemeldete. */
export const standardZustaendig = (objektId?: string): string => (objektId && finde('objekte', objektId)?.betreuerId) || ich()?.id || '';

/** Offene Aufgaben und Meldungen an Objekten, die gerade bei `von` liegen. */
export function offeneArbeit(objektIds: string[], von: string) {
  const ids = new Set(objektIds);
  return {
    aufgaben: alle('aufgaben').filter((a) => !a.erledigt && a.zustaendigId === von && a.objektId && ids.has(a.objektId)),
    meldungen: alle('vorgaenge').filter((v) => v.status !== 'Erledigt' && v.zustaendigId === von && ids.has(v.objektId)),
  };
}
export function arbeitUebergeben(arbeit: { aufgaben: Satz[]; meldungen: Satz[] }, an: string): number {
  arbeit.aufgaben.forEach((a) => speichere('aufgaben', { id: a.id, zustaendigId: an }));
  arbeit.meldungen.forEach((v) => speichere('vorgaenge', { id: v.id, zustaendigId: an }));
  return arbeit.aufgaben.length + arbeit.meldungen.length;
}
/** Nicht zugeordnete Aufgaben und Meldungen eines Objekts bekommen den (neuen) Betreuer. */
export function unverteiltZuweisen(objektId: string, an: string) {
  alle('aufgaben').filter((a) => !a.erledigt && !a.zustaendigId && a.objektId === objektId).forEach((a) => speichere('aufgaben', { id: a.id, zustaendigId: an }));
  alle('vorgaenge').filter((v) => v.status !== 'Erledigt' && !v.zustaendigId && v.objektId === objektId).forEach((v) => speichere('vorgaenge', { id: v.id, zustaendigId: an }));
}
