/**
 * VERBINDUNG ZUM SERVER (api/index.php auf dem eigenen Webspace)
 * ---------------------------------------------------------------
 * Alle Aufrufe gehen an dieselbe Adresse wie die Website (kein Fremddienst).
 * Die Anmeldung steckt in einem HttpOnly-Cookie, das JavaScript nicht lesen kann.
 * Gibt es keinen Server (z. B. in der Vorschau bei Netlify), läuft das Tool im
 * Demo-Modus nur im Browser.
 */
export type Antwort = { status: number; json: any; netz: boolean };

export async function api(aktion: string, body?: unknown): Promise<Antwort> {
  try {
    const r = await fetch(`/api/?a=${encodeURIComponent(aktion)}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'X-HaDie': '1' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
      cache: 'no-store',
    });
    let json: any = null;
    try { json = await r.json(); } catch { /* keine JSON-Antwort: kein Server unter dieser Adresse */ }
    return { status: r.status, json, netz: false };
  } catch {
    return { status: 0, json: null, netz: true };
  }
}

export type ServerStatus = 'kein-server' | 'nicht-konfiguriert' | 'keine-datenbank' | 'bereit' | 'netzfehler';
export async function serverStatus(): Promise<{ art: ServerStatus; eingerichtet: boolean }> {
  const a = await api('status');
  if (a.netz) return { art: 'netzfehler', eingerichtet: false };
  if (!a.json || a.json.server !== true) return { art: 'kein-server', eingerichtet: false };
  if (!a.json.konfiguriert) return { art: 'nicht-konfiguriert', eingerichtet: false };
  if (!a.json.datenbank) return { art: 'keine-datenbank', eingerichtet: false };
  return { art: 'bereit', eingerichtet: !!a.json.eingerichtet };
}

/** Meldet die Sitzung ab (Server) und räumt den Browser auf. */
export async function abmelden() {
  if (sessionStorage.getItem('hadie-modus') === 'server') await api('abmelden', {});
  ['hadie-verwaltung', 'hadie-kunde', 'hadie-modus', 'hadie-admin'].forEach((k) => sessionStorage.removeItem(k));
}
/** Admin-Zugang (Inhaber)? Nur Anzeige – entscheiden tut der Server. */
export const istAdmin = () => sessionStorage.getItem('hadie-admin') === '1';
export const modus = (): 'server' | 'demo' => (sessionStorage.getItem('hadie-modus') === 'server' ? 'server' : 'demo');
