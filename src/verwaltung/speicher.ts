/**
 * DATENSPEICHER des Verwaltertools
 * ---------------------------------------------------------------
 * Einzige Stelle, an der Daten gelesen und geschrieben werden.
 *
 *  Server-Modus: Die Daten liegen in der Datenbank auf dem Webspace. Im Browser
 *    stehen sie nur im Arbeitsspeicher; Änderungen werden sofort zum Server geschickt
 *    (mit Wiederholung bei Netzproblemen). Bei Rückkehr in den Tab werden
 *    Änderungen anderer Personen nachgeladen.
 *  Demo-Modus: Die Daten bleiben im Browser dieses Geräts (localStorage).
 *    Dieser Modus gilt, wenn es keinen Server gibt (z. B. Vorschau bei Netlify).
 */
import { api, modus } from './cloud';

export type Satz = { id: string; [feld: string]: any };
type Daten = Record<string, Satz[]>;
export type Sicherung = 'ok' | 'speichert' | 'fehler';

const SCHLUESSEL = 'hadie-verwaltung-daten-v1';
const hoerer = new Set<() => void>();
const statusHoerer = new Set<(s: Sicherung, text?: string) => void>();

const serverModus = () => modus() === 'server';
let db: Daten = {};

function ladenLokal(): Daten {
  try {
    const roh = JSON.parse(localStorage.getItem(SCHLUESSEL) || '{}');
    return roh && typeof roh === 'object' && !Array.isArray(roh) ? roh : {};
  } catch {
    return {};
  }
}
if (!serverModus()) db = ladenLokal();

/* ---------- Server: Warteschlange ---------- */
type Op = { art: 's'; t: string; id: string; d: Satz } | { art: 'l'; t: string; id: string } | { art: 'e'; alles: Daten };
let schlange: Op[] = [];
let laeuft = false;
let wiederholung: ReturnType<typeof setTimeout> | null = null;
let letzterStatus: Sicherung = 'ok';

const melde = (s: Sicherung, text?: string) => { letzterStatus = s; statusHoerer.forEach((f) => f(s, text)); };
export const beiSicherung = (f: (s: Sicherung, text?: string) => void) => { statusHoerer.add(f); f(letzterStatus); };
export const offeneAenderungen = () => schlange.length > 0 || laeuft;

async function senden() {
  if (laeuft || !schlange.length) return;
  laeuft = true;
  melde('speichert');
  try {
    while (schlange.length) {
      const op = schlange[0];
      let a;
      if (op.art === 'e') a = await api('ersetzen', { alles: op.alles });
      else if (op.art === 's') {
        const zeilen: { t: string; id: string; d: Satz }[] = [];
        for (const o of schlange) { if (o.art !== 's') break; zeilen.push({ t: o.t, id: o.id, d: o.d }); }
        a = await api('schreiben', { zeilen });
        if (a.json?.ok) { schlange.splice(0, zeilen.length); continue; }
      } else {
        const zeilen: { t: string; id: string }[] = [];
        for (const o of schlange) { if (o.art !== 'l') break; zeilen.push({ t: o.t, id: o.id }); }
        a = await api('loeschen', { zeilen });
        if (a.json?.ok) { schlange.splice(0, zeilen.length); continue; }
      }
      if (a.json?.ok) { schlange.shift(); continue; }
      if (a.status === 401) { melde('fehler', 'Sitzung abgelaufen'); location.assign('/kundenlogin/'); return; }
      if (a.status === 400 || a.status === 403 || a.status === 413) {
        // Wird vom Server abgelehnt: erneutes Senden hilft nicht. Verwerfen und neu laden, damit nichts Falsches stehen bleibt.
        schlange.shift();
        melde('fehler', a.json?.fehler || 'Der Server hat die Änderung abgelehnt.');
        continue;
      }
      throw new Error(a.json?.fehler || 'Verbindung fehlgeschlagen');
    }
    melde('ok');
  } catch (e) {
    melde('fehler', 'Nicht gespeichert – neuer Versuch folgt');
    wiederholung = setTimeout(() => { wiederholung = null; void senden(); }, 4000);
  } finally {
    laeuft = false;
  }
}
const einreihen = (op: Op) => { schlange.push(op); void senden(); };
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (e) => { if (serverModus() && offeneAenderungen()) { e.preventDefault(); e.returnValue = ''; } });
}

/** Server-Modus: Daten laden. Gibt false zurück, wenn die Anmeldung nicht (mehr) gilt. */
export async function ladeVomServer(): Promise<boolean> {
  const a = await api('lesen');
  if (a.status === 401) return false;
  if (!a.json?.ok) throw new Error(a.json?.fehler || 'Der Server antwortet nicht.');
  db = a.json.daten && !Array.isArray(a.json.daten) ? a.json.daten : {};
  hoerer.forEach((f) => f());
  return true;
}
/** Änderungen anderer Personen nachladen, solange hier nichts aussteht. */
export async function aktualisieren() {
  if (!serverModus() || offeneAenderungen()) return;
  try { await ladeVomServer(); } catch { /* beim nächsten Mal wieder */ }
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void aktualisieren(); });
  setInterval(() => { if (document.visibilityState === 'visible') void aktualisieren(); }, 60000);
}

/* ---------- Lesen und Schreiben ---------- */
function sichern(op?: Op) {
  if (serverModus()) { if (op) einreihen(op); }
  else localStorage.setItem(SCHLUESSEL, JSON.stringify(db));
  hoerer.forEach((f) => f());
}

export const beiAenderung = (f: () => void) => hoerer.add(f);
export const heute = () => new Date().toISOString().slice(0, 10);
const neueId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const alle = (tabelle: string): Satz[] => db[tabelle] ?? (db[tabelle] = []);
export const finde = (tabelle: string, id?: string) => (id ? alle(tabelle).find((s) => s.id === id) : undefined);

export function speichere(tabelle: string, satz: Partial<Satz>): Satz {
  const liste = alle(tabelle);
  let ergebnis: Satz;
  let patch: Satz;
  if (!satz.id) {
    ergebnis = { ...satz, id: neueId(), angelegt: heute() } as Satz;
    liste.push(ergebnis);
    patch = ergebnis;
  } else {
    const i = liste.findIndex((s) => s.id === satz.id);
    if (i >= 0) liste[i] = { ...liste[i], ...satz } as Satz;
    else liste.push(satz as Satz);
    ergebnis = liste[i >= 0 ? i : liste.length - 1];
    patch = satz as Satz; // nur die geänderten Felder: der Server führt sie mit dem vorhandenen Eintrag zusammen
  }
  sichern({ art: 's', t: tabelle, id: ergebnis.id, d: patch });
  return ergebnis;
}

export function loesche(tabelle: string, ids: string[]) {
  const weg = new Set(ids);
  db[tabelle] = alle(tabelle).filter((s) => !weg.has(s.id));
  sichern();
  ids.forEach((id) => { if (serverModus()) einreihen({ art: 'l', t: tabelle, id }); });
}

export const istLeer = () => Object.values(db).every((l) => !l.length);
export const exportiere = () => JSON.stringify({ format: 'hadie-verwaltung', version: 1, stand: new Date().toISOString(), daten: db }, null, 2);

function ersetzenMit(daten: Daten) {
  db = daten;
  if (serverModus()) { schlange = []; einreihen({ art: 'e', alles: daten }); hoerer.forEach((f) => f()); }
  else sichern();
}
export function importiere(text: string) {
  const roh = JSON.parse(text);
  const daten = roh?.format === 'hadie-verwaltung' ? roh.daten : null;
  if (!daten || typeof daten !== 'object') throw new Error('Das ist keine Sicherung dieses Tools.');
  const sauber: Daten = {};
  for (const [tabelle, liste] of Object.entries(daten)) {
    if (Array.isArray(liste)) sauber[tabelle] = liste.filter((s) => s && typeof s === 'object' && typeof (s as Satz).id === 'string') as Satz[];
  }
  ersetzenMit(sauber);
}
export function ersetze(daten: Daten) { ersetzenMit(daten); }
