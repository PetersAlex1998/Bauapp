/**
 * VORSCHAU-SCHUTZ (Passwort)
 * ---------------------------------------------------------------
 * Solange Impressum und Datenschutzerklärung nicht vollständig sind,
 * sollte die Seite nicht frei zugänglich sein.
 *
 * Einschalten: In Netlify unter «Project configuration → Environment
 * variables» die Variable VORSCHAU_PASSWORT anlegen (Wert = gewünschtes
 * Passwort) und neu veröffentlichen. Der Browser fragt dann nach
 * Benutzername (beliebig) und Passwort.
 *
 * Ausschalten (Livegang): Variable löschen und neu veröffentlichen.
 * Das Passwort steht bewusst NICHT im Repository.
 */
declare const Netlify: { env: { get(name: string): string | undefined } };

export default (request: Request) => {
  const passwort = Netlify.env.get('VORSCHAU_PASSWORT');
  if (!passwort) return; // kein Passwort gesetzt: Seite ist offen

  const kopf = request.headers.get('authorization') ?? '';
  if (kopf.startsWith('Basic ')) {
    try {
      const klartext = atob(kopf.slice(6));
      const eingabe = klartext.slice(klartext.indexOf(':') + 1);
      if (eingabe === passwort) return; // richtig: Anfrage normal weiterreichen
    } catch {
      // ungültige Angabe: wie falsches Passwort behandeln
    }
  }

  return new Response('Diese Seite ist noch nicht öffentlich.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Vorschau", charset="UTF-8"',
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
};

export const config = { path: '/*' };
