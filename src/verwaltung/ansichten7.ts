/**
 * ZUGÄNGE (Konten)
 * ---------------------------------------------------------------
 * Hier richtet die Verwaltung Zugänge für Mitarbeiter (Nummer mit «V-»)
 * und Kunden (Kundennummer) ein. Passwörter werden nur auf dem Server
 * gespeichert und dort verschlüsselt (bcrypt). Dieses Tool sieht sie nie wieder:
 * Es zeigt ein neues Passwort genau einmal beim Anlegen oder Zurücksetzen.
 */
import { alle, finde, speichere } from './speicher';
import { api, istAdmin, modus } from './cloud';
import { formular, h, hinweis, marke, routen, zeichne } from './app';

type Konto = { nummer: string; rolle: 'verwaltung' | 'kunde'; kundeId: string | null; angelegt: number; letzterLogin: number | null; admin?: boolean };
let konten: Konto[] | null = null;
let ladeFehler = '';
let ladeLaeuft = false;

async function laden() {
  if (ladeLaeuft) return;
  ladeLaeuft = true;
  const a = await api('konten');
  if (a.json?.ok) { konten = a.json.konten; ladeFehler = ''; } else ladeFehler = a.json?.fehler || 'Die Zugänge konnten nicht geladen werden.';
  ladeLaeuft = false;
  zeichne();
}

/** Gut lesbares Zufallspasswort ohne verwechselbare Zeichen */
function zufallspasswort(): string {
  const zeichen = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const b = crypto.getRandomValues(new Uint32Array(14));
  return Array.from(b, (x) => zeichen[x % zeichen.length]).join('');
}
const zufallsnummer = () => 'V-' + String(crypto.getRandomValues(new Uint32Array(1))[0] % 900000000 + 100000000);
const zeit = (s: number | null) => (s ? new Date(s * 1000).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : 'noch nie');

function fenster(titel: string, inhalt: Node[], knoepfe: Node[]): HTMLDialogElement {
  const d = h('dialog', { class: 'vw-dialog' }) as HTMLDialogElement;
  d.append(h('div', { class: 'vw-form' },
    h('header', { class: 'vw-dialog__kopf' }, h('h2', {}, titel), h('button', { type: 'button', class: 'vw-x', 'aria-label': 'Schließen', onclick: () => d.close() }, '×')),
    h('div', { class: 'vw-form__felder' }, inhalt),
    h('footer', { class: 'vw-dialog__fuss' }, h('span', { class: 'vw-platz' }), knoepfe)));
  d.addEventListener('close', () => { d.remove(); zeichne(); });
  document.body.append(d);
  d.showModal();
  return d;
}
const feld = (label: string, el: HTMLElement, breit = true, hilfe = '') => h('div', { class: `feld ${breit ? 'feld--breit' : ''}` }, h('label', {}, label), el, hilfe && h('small', {}, hilfe));

/** Zeigt Zugangsdaten genau einmal an. */
function zeigeZugang(nummer: string, passwort: string, titel = 'Zugang bereit') {
  const kopieren = h('button', { type: 'button', class: 'vw-knopf', onclick: async () => { try { await navigator.clipboard.writeText(`Nummer: ${nummer}\nPasswort: ${passwort}`); kopieren.textContent = 'Kopiert ✓'; } catch { kopieren.textContent = 'Bitte von Hand kopieren'; } } }, 'Kopieren');
  const d = fenster(titel, [
    h('p', { class: 'feld--breit' }, 'Geben Sie diese Zugangsdaten sicher weiter (nicht per E-Mail im Klartext, wenn es sich vermeiden lässt). Das Passwort wird nur jetzt angezeigt – danach kann es nur zurückgesetzt werden.'),
    h('dl', { class: 'vw-info feld--breit' }, h('dt', {}, 'Nummer'), h('dd', {}, h('strong', {}, nummer)), h('dt', {}, 'Passwort'), h('dd', {}, h('strong', { style: 'font-family:monospace;font-size:1.1rem' }, passwort))),
  ], [kopieren, h('button', { type: 'button', class: 'vw-knopf vw-knopf--voll', onclick: () => d.close() }, 'Fertig')]);
}

function neuesKonto() {
  const art = h('select', { id: 'k-art' }, istAdmin() && h('option', { value: 'mitarbeiter' }, 'Mitarbeiter (Verwaltung)'), h('option', { value: 'kunde' }, 'Kunde')) as HTMLSelectElement;
  const adminWahl = h('input', { id: 'k-admin', type: 'checkbox' }) as HTMLInputElement;
  const adminFeld = h('div', { class: 'feld feld--breit' }, h('label', { style: 'display:flex;gap:.5rem;align-items:center' }, adminWahl, 'Admin-Zugang: darf Zugänge der Verwaltung verwalten und Sicherungen einspielen'), h('small', {}, 'Nur für den Inhaber oder eine Vertretung. Normale Mitarbeiter brauchen das nicht.'));
  const person = h('select', { id: 'k-person' }) as HTMLSelectElement;
  const nummer = h('input', { id: 'k-nummer', type: 'text', autocapitalize: 'characters' }) as HTMLInputElement;
  const passwort = h('input', { id: 'k-pw', type: 'text', autocomplete: 'off', value: zufallspasswort() }) as HTMLInputElement;
  const fehler = h('p', { class: 'formular__status', role: 'alert', 'data-art': 'fehler', style: 'grid-column:1/-1' });
  const fuellePersonen = () => {
    const kunden = art.value === 'kunde';
    const liste = kunden ? alle('kunden') : alle('mitarbeiter').filter((m) => m.aktiv !== false);
    person.replaceChildren(h('option', { value: '' }, `– ${kunden ? 'Kunde' : 'Mitarbeiter'} wählen –`), ...liste.map((x) => h('option', { value: x.id }, x.name + (!kunden && x.nummer ? ` (${x.nummer})` : ''))));
    nummer.value = kunden ? '' : zufallsnummer();
    nummer.readOnly = kunden;
    adminFeld.hidden = kunden;
  };
  art.addEventListener('change', fuellePersonen);
  person.addEventListener('change', () => { if (art.value === 'kunde') nummer.value = finde('kunden', person.value)?.kundennummer ?? ''; });
  fuellePersonen();
  const d = fenster('Zugang einrichten', [
    feld('Für wen?', art, false), feld('Person', person, false),
    feld('Nummer', nummer, false, 'Kunden melden sich mit ihrer Kundennummer an, Mitarbeiter mit einer Nummer mit „V-“.'),
    feld('Start-Passwort', passwort, false, 'Mindestens 10 Zeichen. Ein Vorschlag ist eingetragen.'), adminFeld, fehler,
  ], [h('button', { type: 'button', class: 'vw-knopf', onclick: () => d.close() }, 'Abbrechen'), h('button', { type: 'button', class: 'vw-knopf vw-knopf--voll', onclick: async (e: Event) => {
    const kunden = art.value === 'kunde';
    if (!person.value) { fehler.textContent = 'Bitte wählen Sie eine Person.'; return; }
    if (!nummer.value.trim()) { fehler.textContent = kunden ? 'Der Kunde hat noch keine Kundennummer. Bitte speichern Sie den Kunden einmal neu.' : 'Bitte tragen Sie eine Nummer ein.'; return; }
    (e.target as HTMLButtonElement).disabled = true;
    const a = await api('konto-setzen', { nummer: nummer.value, passwort: passwort.value, rolle: kunden ? 'kunde' : 'verwaltung', kundeId: kunden ? person.value : '', ...(kunden ? {} : { admin: adminWahl.checked }) });
    (e.target as HTMLButtonElement).disabled = false;
    if (!a.json?.ok) { fehler.textContent = a.json?.fehler || 'Der Zugang konnte nicht angelegt werden.'; return; }
    const n = nummer.value.replace(/\s+/g, '').toUpperCase();
    if (!kunden) speichere('mitarbeiter', { id: person.value, nummer: n });
    konten = null;
    d.close();
    zeigeZugang(n, passwort.value);
  } }, 'Zugang anlegen')]);
}

function zuruecksetzen(k: Konto) {
  const pw = h('input', { type: 'text', value: zufallspasswort(), autocomplete: 'off' }) as HTMLInputElement;
  const fehler = h('p', { class: 'formular__status', role: 'alert', 'data-art': 'fehler', style: 'grid-column:1/-1' });
  const d = fenster(`Passwort zurücksetzen: ${k.nummer}`, [feld('Neues Passwort', pw, true, 'Alle bestehenden Anmeldungen dieses Zugangs werden beendet.'), fehler],
    [h('button', { type: 'button', class: 'vw-knopf', onclick: () => d.close() }, 'Abbrechen'), h('button', { type: 'button', class: 'vw-knopf vw-knopf--voll', onclick: async () => {
      const a = await api('konto-setzen', { nummer: k.nummer, passwort: pw.value, rolle: k.rolle, kundeId: k.kundeId ?? '' });
      if (!a.json?.ok) { fehler.textContent = a.json?.fehler || 'Das Passwort konnte nicht gesetzt werden.'; return; }
      d.close(); zeigeZugang(k.nummer, pw.value, 'Neues Passwort');
    } }, 'Zurücksetzen')]);
}

function eigenesPasswort() {
  const alt = h('input', { type: 'password', autocomplete: 'current-password' }) as HTMLInputElement;
  const neu = h('input', { type: 'password', autocomplete: 'new-password' }) as HTMLInputElement;
  const neu2 = h('input', { type: 'password', autocomplete: 'new-password' }) as HTMLInputElement;
  const fehler = h('p', { class: 'formular__status', role: 'alert', 'data-art': 'fehler', style: 'grid-column:1/-1' });
  const d = fenster('Mein Passwort ändern', [feld('Aktuelles Passwort', alt), feld('Neues Passwort', neu, true, 'Mindestens 10 Zeichen.'), feld('Neues Passwort wiederholen', neu2), fehler],
    [h('button', { type: 'button', class: 'vw-knopf', onclick: () => d.close() }, 'Abbrechen'), h('button', { type: 'button', class: 'vw-knopf vw-knopf--voll', onclick: async () => {
      if (neu.value !== neu2.value) { fehler.textContent = 'Die beiden neuen Passwörter sind nicht gleich.'; return; }
      const a = await api('passwort', { alt: alt.value, neu: neu.value });
      if (a.json?.ok) { d.close(); hinweis('Passwort geändert'); return; }
      fehler.textContent = a.json?.grund === 'alt' ? 'Das aktuelle Passwort stimmt nicht.' : a.json?.grund === 'kurz' ? 'Das neue Passwort braucht mindestens 10 Zeichen.' : a.json?.fehler || 'Das Passwort konnte nicht geändert werden.';
    } }, 'Passwort ändern')]);
}

routen.konten = () => {
  const kopf = h('header', { class: 'vw-seitenkopf' }, h('h1', {}, 'Zugänge'),
    h('p', {}, 'Wer sich anmelden darf: Mitarbeiter der Verwaltung und Kunden. Ein Kunde sieht nach der Anmeldung nur seine eigenen Objekte, Rechnungen und Meldungen.'));
  if (modus() !== 'server') {
    return h('div', { class: 'vw-stapel' }, kopf, h('section', { class: 'vw-karte vw-text' }, h('h2', {}, 'Nur mit Server'),
      h('p', {}, 'Dies ist der Demo-Modus: Es gibt keinen Server und damit keine echten Zugänge. Auf Ihrem Webspace mit Datenbank richten Sie hier Zugänge ein.')));
  }
  if (konten === null) { void laden(); }
  const liste = konten ?? [];
  const person = (k: Konto) => k.rolle === 'kunde' ? finde('kunden', k.kundeId ?? '')?.name ?? '–' : alle('mitarbeiter').find((m) => String(m.nummer ?? '').toUpperCase() === k.nummer)?.name ?? '–';
  const ohneZugang = alle('mitarbeiter').filter((m) => m.aktiv !== false && !liste.some((k) => k.nummer === String(m.nummer ?? '').toUpperCase())).length;
  return h('div', { class: 'vw-stapel' }, kopf,
    ladeFehler && h('p', { class: 'vw-warnung' }, ladeFehler),
    h('div', { class: 'vw-reihe' },
      h('button', { class: 'vw-knopf vw-knopf--voll', onclick: neuesKonto }, '+ Zugang einrichten'),
      h('button', { class: 'vw-knopf', onclick: eigenesPasswort }, 'Mein Passwort ändern'),
      ohneZugang > 0 && h('span', { class: 'vw-fein' }, `${ohneZugang} Mitarbeiter ohne Zugang`)),
    h('section', { class: 'vw-karte' }, h('div', { class: 'vw-tabelle' }, h('table', {},
      h('thead', {}, h('tr', {}, ['Nummer', 'Art', 'Person', 'Letzte Anmeldung', ''].map((t) => h('th', { scope: 'col' }, t)))),
      h('tbody', {}, konten === null ? [h('tr', {}, h('td', { colspan: 5, class: 'vw-leer' }, 'Wird geladen …'))]
        : liste.length ? liste.map((k) => h('tr', {},
          h('td', { 'data-spalte': 'Nummer' }, h('strong', {}, k.nummer)),
          h('td', { 'data-spalte': 'Art' }, marke(k.rolle === 'verwaltung' ? (k.admin ? 'Verwaltung · Admin' : 'Verwaltung') : 'Kunde', k.rolle === 'verwaltung' ? 'blau' : 'grau')),
          h('td', { 'data-spalte': 'Person' }, person(k)),
          h('td', { 'data-spalte': 'Letzte Anmeldung' }, zeit(k.letzterLogin)),
          h('td', { class: 'vw-aktion' }, (k.rolle === 'kunde' || istAdmin()) && [
            h('button', { class: 'vw-knopf vw-knopf--klein', onclick: () => zuruecksetzen(k) }, 'Passwort zurücksetzen'), ' ',
            h('button', { class: 'vw-knopf vw-knopf--klein vw-knopf--gefahr', onclick: async () => {
              if (!confirm(`Zugang ${k.nummer} (${person(k)}) wirklich löschen? Die Person kann sich dann nicht mehr anmelden.`)) return;
              const a = await api('konto-loeschen', { nummer: k.nummer });
              if (a.json?.ok) { hinweis('Zugang gelöscht'); konten = null; zeichne(); } else alert(a.json?.fehler || 'Der Zugang konnte nicht gelöscht werden.');
            } }, 'Löschen')])))
        : [h('tr', {}, h('td', { colspan: 5, class: 'vw-leer' }, 'Noch keine Zugänge.'))])))));
};
