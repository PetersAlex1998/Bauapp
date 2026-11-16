/**
 * DATENSPEICHER des Verwaltertools
 * ---------------------------------------------------------------
 * Einzige Stelle, an der Daten gelesen und geschrieben werden.
 * Aktuell liegen sie im Browser dieses Geräts (localStorage).
 * Für echten Mehrbenutzer-Betrieb wird nur diese Datei gegen eine
 * Server-Anbindung getauscht – der Rest des Tools bleibt gleich.
 */
export type Satz = { id: string; [feld: string]: any };
type Daten = Record<string, Satz[]>;

const SCHLUESSEL = 'hadie-verwaltung-daten-v1';
const hoerer = new Set<() => void>();

function laden(): Daten {
  try {
    const roh = JSON.parse(localStorage.getItem(SCHLUESSEL) || '{}');
    return roh && typeof roh === 'object' && !Array.isArray(roh) ? roh : {};
  } catch {
    return {};
  }
}
let db: Daten = laden();

function sichern() {
  localStorage.setItem(SCHLUESSEL, JSON.stringify(db));
  hoerer.forEach((f) => f());
}

export const beiAenderung = (f: () => void) => hoerer.add(f);
export const heute = () => new Date().toISOString().slice(0, 10);
const neueId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const alle = (tabelle: string): Satz[] => db[tabelle] ?? (db[tabelle] = []);
export const finde = (tabelle: string, id?: string) => (id ? alle(tabelle).find((s) => s.id === id) : undefined);

export function speichere(tabelle: string, satz: Partial<Satz>): Satz {
  const liste = alle(tabelle);
  if (!satz.id) {
    const neu = { ...satz, id: neueId(), angelegt: heute() } as Satz;
    liste.push(neu);
    sichern();
    return neu;
  }
  const i = liste.findIndex((s) => s.id === satz.id);
  if (i >= 0) liste[i] = { ...liste[i], ...satz } as Satz;
  else liste.push(satz as Satz);
  sichern();
  return liste[i >= 0 ? i : liste.length - 1];
}

export function loesche(tabelle: string, ids: string[]) {
  const weg = new Set(ids);
  db[tabelle] = alle(tabelle).filter((s) => !weg.has(s.id));
  sichern();
}

export const istLeer = () => Object.values(db).every((l) => !l.length);
export const exportiere = () => JSON.stringify({ format: 'hadie-verwaltung', version: 1, stand: new Date().toISOString(), daten: db }, null, 2);

export function importiere(text: string) {
  const roh = JSON.parse(text);
  const daten = roh?.format === 'hadie-verwaltung' ? roh.daten : null;
  if (!daten || typeof daten !== 'object') throw new Error('Das ist keine Sicherung dieses Tools.');
  const sauber: Daten = {};
  for (const [tabelle, liste] of Object.entries(daten)) {
    if (Array.isArray(liste)) sauber[tabelle] = liste.filter((s) => s && typeof s === 'object' && typeof (s as Satz).id === 'string') as Satz[];
  }
  db = sauber;
  sichern();
}

export function ersetze(daten: Daten) {
  db = daten;
  sichern();
}
