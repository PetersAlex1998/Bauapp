/**
 * ZUGÄNGE (Konten)
 * ---------------------------------------------------------------
 * Hier richtet die Verwaltung Zugänge für Mitarbeiter (Nummer mit «V-»)
 * und Kunden (Kundennummer) ein. Passwörter werden nur auf dem Server
 * gespeichert und dort verschlüsselt (bcrypt). Dieses Tool sieht sie nie wieder:
 * Es zeigt ein neues Passwort genau einmal beim Anlegen oder Zurücksetzen.
 */
import { alle, finde, speichere } from './speicher';
import qrcode from 'qrcode-generator';
import { api, hatZweiFaktor, istAdmin, modus } from './cloud';
import { formular, h, hinweis, marke, routen, zeichne } from './app';
import { bogen, briefInfo, gruss } from './ansichten2';
import { druckeBlatt } from './druck';
import { ich } from './ansicht';

type Konto = { nummer: string; rolle: 'verwaltung' | 'kunde'; kundeId: string | null; angelegt: number; letzterLogin: number | null; admin?: boolean; zweiFaktor?: boolean };
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

type Empfaenger = { name?: string; strasse?: string; ort?: string; kunde?: boolean };

/** Zugangsdaten als Brief im Briefbogen (zum Ausdrucken oder als PDF) */
function zugangsbrief(nummer: string, passwort: string, an: Empfaenger): HTMLElement {
  const kunde = an.kunde !== false;
  const adresse = 'www.hadie-immobilien.de/kundenlogin/';
  return bogen([an.name || 'Persönlich', an.strasse, an.ort], kunde ? 'Ihre Zugangsdaten zum Kundenbereich' : 'Ihre Zugangsdaten zum Verwaltungstool',
    briefInfo(['Benutzer', nummer]),
    h('p', {}, an.name ? `Guten Tag ${an.name},` : 'Guten Tag,'),
    h('p', {}, kunde
      ? 'für Sie ist ein persönlicher Zugang zu unserem Kundenbereich eingerichtet. Dort sehen Sie jederzeit Ihre Objekte, Abrechnungen und Rechnungen und können uns Anliegen direkt melden.'
      : 'für Sie ist ein persönlicher Zugang zu unserem Verwaltungstool eingerichtet.'),
    h('table', { class: 'vw-tabelle din__zugang' }, h('tbody', {},
      h('tr', {}, h('th', {}, 'Anmeldung unter'), h('td', {}, adresse)),
      h('tr', {}, h('th', {}, kunde ? 'Kundennummer' : 'Benutzername'), h('td', {}, h('strong', {}, nummer))),
      h('tr', {}, h('th', {}, 'Start-Passwort'), h('td', {}, h('strong', { style: 'font-family:monospace;font-size:11pt' }, passwort))))),
    h('p', {}, 'Bitte ändern Sie das Passwort nach der ersten Anmeldung und bewahren Sie dieses Schreiben sicher auf oder vernichten Sie es. Geben Sie Ihre Zugangsdaten nicht an Dritte weiter.'),
    h('p', {}, 'Bei Fragen erreichen Sie uns gern telefonisch oder per E-Mail.'),
    ...gruss());
}

/** Zeigt Zugangsdaten genau einmal an. */
function zeigeZugang(nummer: string, passwort: string, titel = 'Zugang bereit', an: Empfaenger = {}) {
  const kopieren = h('button', { type: 'button', class: 'vw-knopf', onclick: async () => { try { await navigator.clipboard.writeText(`Nummer: ${nummer}\nPasswort: ${passwort}`); kopieren.textContent = 'Kopiert ✓'; } catch { kopieren.textContent = 'Bitte von Hand kopieren'; } } }, 'Kopieren');
  const drucken = h('button', { type: 'button', class: 'vw-knopf', onclick: () => druckeBlatt(zugangsbrief(nummer, passwort, an)) }, 'Als Brief drucken / PDF');
  const d = fenster(titel, [
    h('p', { class: 'feld--breit' }, 'Geben Sie diese Zugangsdaten sicher weiter (nicht per E-Mail im Klartext, wenn es sich vermeiden lässt). Das Passwort wird nur jetzt angezeigt – danach kann es nur zurückgesetzt werden.'),
    h('dl', { class: 'vw-info feld--breit' }, h('dt', {}, 'Nummer'), h('dd', {}, h('strong', {}, nummer)), h('dt', {}, 'Passwort'), h('dd', {}, h('strong', { style: 'font-family:monospace;font-size:1.1rem' }, passwort))),
  ], [kopieren, drucken, h('button', { type: 'button', class: 'vw-knopf vw-knopf--voll', onclick: () => d.close() }, 'Fertig')]);
}

/** Empfänger eines Zugangs aus Kunden- oder Mitarbeiterdaten */
function empfaengerVon(nummer: string, kundeId?: string): Empfaenger {
  const k = kundeId ? finde('kunden', kundeId) : undefined;
  if (k) return { name: k.name, strasse: k.strasse, ort: k.ort, kunde: true };
  const m = alle('mitarbeiter').find((x) => String(x.nummer ?? '').toUpperCase() === nummer.toUpperCase());
  return m ? { name: m.name, kunde: false } : { kunde: !nummer.toUpperCase().startsWith('V-') };
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
    zeigeZugang(n, passwort.value, 'Zugang bereit', empfaengerVon(n, kunden ? person.value : ''));
  } }, 'Zugang anlegen')]);
}

function zuruecksetzen(k: Konto) {
  const pw = h('input', { type: 'text', value: zufallspasswort(), autocomplete: 'off' }) as HTMLInputElement;
  const fehler = h('p', { class: 'formular__status', role: 'alert', 'data-art': 'fehler', style: 'grid-column:1/-1' });
  const d = fenster(`Passwort zurücksetzen: ${k.nummer}`, [feld('Neues Passwort', pw, true, 'Alle bestehenden Anmeldungen dieses Zugangs werden beendet.'), fehler],
    [h('button', { type: 'button', class: 'vw-knopf', onclick: () => d.close() }, 'Abbrechen'), h('button', { type: 'button', class: 'vw-knopf vw-knopf--voll', onclick: async () => {
      const a = await api('konto-setzen', { nummer: k.nummer, passwort: pw.value, rolle: k.rolle, kundeId: k.kundeId ?? '' });
      if (!a.json?.ok) { fehler.textContent = a.json?.fehler || 'Das Passwort konnte nicht gesetzt werden.'; return; }
      d.close(); zeigeZugang(k.nummer, pw.value, 'Neues Passwort', empfaengerVon(k.nummer, k.kundeId ?? undefined));
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

/* ---------- Mitarbeiter mit Zugang in einem Schritt ---------- */
const benutzerVorschlag = (name: string) => {
  const teile = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'SS').toUpperCase().replace(/[^A-Z ]/g, '').trim().split(/\s+/).filter(Boolean);
  if (!teile.length) return 'V-';
  const kern = teile.length > 1 ? teile[0][0] + teile[teile.length - 1] : teile[0];
  return 'V-' + kern.slice(0, 20);
};
function mitarbeiterAnlegen() {
  const name = h('input', { type: 'text', required: true, autocomplete: 'off' }) as HTMLInputElement;
  const rolle = h('select', {}, ['Objektbetreuer/in', 'Geschäftsführung', 'Buchhaltung', 'Hausmeister / Technik', 'Auszubildende/r', 'Sonstiges'].map((r) => h('option', {}, r))) as HTMLSelectElement;
  const kuerzel = h('input', { type: 'text', maxlength: 4 }) as HTMLInputElement;
  const telefon = h('input', { type: 'tel' }) as HTMLInputElement;
  const email = h('input', { type: 'email' }) as HTMLInputElement;
  const benutzer = h('input', { type: 'text', autocapitalize: 'characters', value: 'V-', autocomplete: 'off' }) as HTMLInputElement;
  const passwort = h('input', { type: 'text', autocomplete: 'off', value: zufallspasswort() }) as HTMLInputElement;
  const admin = h('input', { type: 'checkbox' }) as HTMLInputElement;
  const fehler = h('p', { class: 'formular__status', role: 'alert', 'data-art': 'fehler', style: 'grid-column:1/-1' });
  let vonHand = false;
  benutzer.addEventListener('input', () => { vonHand = true; });
  name.addEventListener('input', () => {
    if (!vonHand) benutzer.value = benutzerVorschlag(name.value);
    if (!kuerzel.dataset.hand) kuerzel.value = name.value.split(/\s+/).filter(Boolean).map((t) => t[0]).join('').toUpperCase().slice(0, 3);
  });
  kuerzel.addEventListener('input', () => { kuerzel.dataset.hand = '1'; });
  const d = fenster('Mitarbeiter anlegen', [
    feld('Name *', name, false), feld('Funktion', rolle, false),
    feld('Kürzel', kuerzel, false), feld('Telefon', telefon, false), feld('E-Mail', email, true),
    h('p', { class: 'feld--breit vw-fein', style: 'margin:.5rem 0 0' }, h('strong', {}, 'Zugang zum Tool')),
    feld('Benutzername *', benutzer, false, 'Beginnt mit „V-“, z. B. V-SPETERS. Damit meldet sich die Person an.'),
    feld('Start-Passwort *', passwort, false, 'Mindestens 10 Zeichen. Ein sicherer Vorschlag ist eingetragen.'),
    h('div', { class: 'feld feld--breit' }, h('label', { style: 'display:flex;gap:.5rem;align-items:center' }, admin, 'Admin-Zugang (sieht die Administration, legt Mitarbeiter an, ordnet Objekte zu)')),
    fehler,
  ], [h('button', { type: 'button', class: 'vw-knopf', onclick: () => d.close() }, 'Abbrechen'), h('button', { type: 'button', class: 'vw-knopf vw-knopf--voll', onclick: async (e: Event) => {
    const n = benutzer.value.replace(/\s+/g, '').toUpperCase();
    if (name.value.trim().length < 2) { fehler.textContent = 'Bitte den Namen eintragen.'; name.focus(); return; }
    if (!/^V-[A-Z0-9-]{2,27}$/.test(n)) { fehler.textContent = 'Der Benutzername beginnt mit „V-“ und enthält danach nur Buchstaben, Ziffern oder Bindestriche.'; benutzer.focus(); return; }
    if (passwort.value.length < 10) { fehler.textContent = 'Das Passwort braucht mindestens 10 Zeichen.'; passwort.focus(); return; }
    if (alle('mitarbeiter').some((m) => String(m.nummer ?? '').toUpperCase() === n)) { fehler.textContent = 'Diesen Benutzernamen hat schon ein Mitarbeiter.'; return; }
    (e.target as HTMLButtonElement).disabled = true;
    const a = await api('konto-setzen', { nummer: n, passwort: passwort.value, rolle: 'verwaltung', admin: admin.checked });
    (e.target as HTMLButtonElement).disabled = false;
    if (!a.json?.ok) { fehler.textContent = a.json?.fehler || 'Der Zugang konnte nicht angelegt werden.'; return; }
    speichere('mitarbeiter', { name: name.value.trim(), rolle: rolle.value, kuerzel: kuerzel.value.trim(), telefon: telefon.value.trim(), email: email.value.trim(), nummer: n, aktiv: true });
    konten = null;
    d.close();
    zeigeZugang(n, passwort.value, 'Mitarbeiter angelegt', { name: name.value.trim(), kunde: false });
  } }, 'Anlegen')]);
  name.focus();
}

/* ---------- Zwei-Faktor-Anmeldung ---------- */
async function zweiFaktorEinrichten() {
  const start = await api('zwei-faktor-start', {});
  if (!start.json?.ok) { alert(start.json?.fehler || 'Die Einrichtung konnte nicht gestartet werden.'); return; }
  const qr = qrcode(0, 'M');
  qr.addData(start.json.uri);
  qr.make();
  const bild = h('img', { src: qr.createDataURL(5, 4), alt: 'QR-Code für die Authenticator-App', width: 220, height: 220, style: 'image-rendering:pixelated;background:#fff;border-radius:.5rem' });
  const geheim = String(start.json.geheim).replace(/(.{4})/g, '$1 ').trim();
  const code = h('input', { type: 'text', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: 6, placeholder: '123456' }) as HTMLInputElement;
  const fehler = h('p', { class: 'formular__status', role: 'alert', 'data-art': 'fehler', style: 'grid-column:1/-1' });
  const d = fenster('Zwei-Faktor-Anmeldung einrichten', [
    h('ol', { class: 'feld--breit', style: 'margin:0;padding-left:1.2rem;line-height:1.6' },
      h('li', {}, 'Öffnen Sie auf Ihrem Handy eine Authenticator-App (z. B. Google Authenticator, Microsoft Authenticator, Apple Passwörter oder 2FAS).'),
      h('li', {}, 'Scannen Sie diesen QR-Code – oder geben Sie den Schlüssel von Hand ein.'),
      h('li', {}, 'Tragen Sie zur Bestätigung den 6-stelligen Code aus der App ein.')),
    h('div', { class: 'feld--breit', style: 'display:flex;flex-wrap:wrap;gap:1.25rem;align-items:center' }, bild,
      h('div', {}, h('small', {}, 'Schlüssel zum Eintippen:'), h('p', { style: 'font-family:monospace;font-size:1rem;margin:.3rem 0 0;word-break:break-all' }, geheim))),
    feld('Code aus der App', code, false), fehler,
  ], [h('button', { type: 'button', class: 'vw-knopf', onclick: () => d.close() }, 'Abbrechen'), h('button', { type: 'button', class: 'vw-knopf vw-knopf--voll', onclick: async (e: Event) => {
    (e.target as HTMLButtonElement).disabled = true;
    const a = await api('zwei-faktor-bestaetigen', { code: code.value.replace(/\s/g, '') });
    (e.target as HTMLButtonElement).disabled = false;
    if (!a.json?.ok) { fehler.textContent = a.json?.grund === 'code' ? 'Der Code stimmt nicht. Bitte nehmen Sie den aktuellen Code aus der App (er wechselt alle 30 Sekunden).' : a.json?.fehler || 'Das hat nicht geklappt.'; code.value = ''; code.focus(); return; }
    sessionStorage.setItem('hadie-2fa', '1');
    konten = null;
    d.close();
    zeigeErsatzcodes(a.json.ersatzcodes as string[]);
  } }, 'Bestätigen')]);
  code.focus();
}

/** Ersatzcodes als persönliches Schreiben im Briefbogen */
function ersatzbrief(codes: string[]): HTMLElement {
  const m = ich();
  return bogen([m?.name || 'Persönlich', 'Persönlich / vertraulich'], 'Ihre Ersatzcodes für die Zwei-Faktor-Anmeldung',
    m?.nummer ? briefInfo(['Benutzer', m.nummer]) : null,
    h('p', {}, m?.name ? `Guten Tag ${m.name},` : 'Guten Tag,'),
    h('p', {}, 'die Zwei-Faktor-Anmeldung für Ihren Zugang ist aktiv. Falls Ihr Handy verloren geht, melden Sie sich mit einem der folgenden Codes an. Jeder Code funktioniert genau einmal.'),
    h('ul', { class: 'din__codes' }, codes.map((c) => h('li', {}, c))),
    h('p', {}, 'Bitte bewahren Sie dieses Schreiben getrennt von Ihrem Handy und unter Verschluss auf. Wenn Sie alle Codes verbraucht haben oder das Schreiben verloren geht, richten Sie die Zwei-Faktor-Anmeldung neu ein.'),
    ...gruss());
}

function zeigeErsatzcodes(codes: string[]) {
  const text = `HaDie-Immobilien – Ersatzcodes für die Zwei-Faktor-Anmeldung\nJeder Code funktioniert genau einmal.\n\n${codes.join('\n')}`;
  const kopieren = h('button', { type: 'button', class: 'vw-knopf', onclick: async () => { try { await navigator.clipboard.writeText(text); kopieren.textContent = 'Kopiert ✓'; } catch { kopieren.textContent = 'Bitte abschreiben'; } } }, 'Kopieren');
  const d = fenster('Fertig – Ihre Ersatzcodes', [
    h('p', { class: 'feld--breit' }, 'Die Zwei-Faktor-Anmeldung ist aktiv. Wenn Ihr Handy verloren geht, melden Sie sich mit einem dieser Codes an. ', h('strong', {}, 'Bewahren Sie sie getrennt vom Handy auf'), ' (ausdrucken oder im Passwort-Manager). Sie werden nur jetzt angezeigt.'),
    h('ul', { class: 'feld--breit', style: 'columns:2;list-style:none;padding:0;margin:0;font-family:monospace;font-size:1.05rem;line-height:1.9' }, codes.map((c) => h('li', {}, c))),
  ], [kopieren, h('button', { type: 'button', class: 'vw-knopf', onclick: () => druckeBlatt(ersatzbrief(codes)) }, 'Als Brief drucken / PDF'), h('button', { type: 'button', class: 'vw-knopf vw-knopf--voll', onclick: () => d.close() }, 'Ich habe sie gesichert')]);
}

function zweiFaktorAus() {
  const pw = h('input', { type: 'password', autocomplete: 'current-password' }) as HTMLInputElement;
  const code = h('input', { type: 'text', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: 12 }) as HTMLInputElement;
  const fehler = h('p', { class: 'formular__status', role: 'alert', 'data-art': 'fehler', style: 'grid-column:1/-1' });
  const d = fenster('Zwei-Faktor-Anmeldung abschalten', [
    h('p', { class: 'feld--breit' }, 'Ohne zweiten Faktor reicht wieder das Passwort allein. Zur Bestätigung:'),
    feld('Passwort', pw, false), feld('Code aus der App oder Ersatzcode', code, false), fehler,
  ], [h('button', { type: 'button', class: 'vw-knopf', onclick: () => d.close() }, 'Abbrechen'), h('button', { type: 'button', class: 'vw-knopf vw-knopf--gefahr', onclick: async () => {
    const a = await api('zwei-faktor-aus', { passwort: pw.value, code: code.value });
    if (!a.json?.ok) { fehler.textContent = a.json?.grund === 'falsch' ? 'Passwort oder Code stimmen nicht.' : a.json?.fehler || 'Das hat nicht geklappt.'; return; }
    sessionStorage.setItem('hadie-2fa', '');
    konten = null; d.close(); hinweis('Zwei-Faktor-Anmeldung abgeschaltet');
  } }, 'Abschalten')]);
}

routen.konten = () => {
  const kopf = h('header', { class: 'vw-seitenkopf' }, h('h1', {}, istAdmin() ? 'Mitarbeiter & Zugänge' : 'Mein Zugang & Kunden-Zugänge'),
    h('p', {}, istAdmin()
      ? 'Legen Sie Mitarbeiter mit Benutzername und Passwort an und verwalten Sie alle Zugänge. Ein Kunde sieht nach der Anmeldung nur seine eigenen Objekte, Rechnungen und Meldungen.'
      : 'Ihr eigenes Passwort und die Zwei-Faktor-Anmeldung – sowie die Zugänge Ihrer Kunden.'));
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
    !hatZweiFaktor() && h('p', { class: 'vw-warnung' }, h('strong', {}, 'Ihr Zugang ist nur mit Passwort geschützt. '), 'Richten Sie die Zwei-Faktor-Anmeldung ein – dann braucht eine Anmeldung zusätzlich einen Code von Ihrem Handy.'),
    h('div', { class: 'vw-reihe' },
      istAdmin() && h('button', { class: 'vw-knopf vw-knopf--voll', onclick: mitarbeiterAnlegen }, '+ Mitarbeiter anlegen'),
      h('button', { class: istAdmin() ? 'vw-knopf' : 'vw-knopf vw-knopf--voll', onclick: neuesKonto }, istAdmin() ? 'Zugang für Bestehende' : '+ Kunden-Zugang einrichten'),
      h('button', { class: 'vw-knopf', onclick: eigenesPasswort }, 'Mein Passwort ändern'),
      hatZweiFaktor()
        ? h('button', { class: 'vw-knopf', onclick: zweiFaktorAus }, 'Zwei-Faktor abschalten')
        : h('button', { class: 'vw-knopf', onclick: zweiFaktorEinrichten }, 'Zwei-Faktor einrichten'),
      ohneZugang > 0 && h('span', { class: 'vw-fein' }, `${ohneZugang} Mitarbeiter ohne Zugang`)),
    h('section', { class: 'vw-karte' }, h('div', { class: 'vw-tabelle' }, h('table', {},
      h('thead', {}, h('tr', {}, ['Nummer', 'Art', 'Person', 'Letzte Anmeldung', ''].map((t) => h('th', { scope: 'col' }, t)))),
      h('tbody', {}, konten === null ? [h('tr', {}, h('td', { colspan: 5, class: 'vw-leer' }, 'Wird geladen …'))]
        : liste.length ? liste.map((k) => h('tr', {},
          h('td', { 'data-spalte': 'Nummer' }, h('strong', {}, k.nummer)),
          h('td', { 'data-spalte': 'Art' }, marke(k.rolle === 'verwaltung' ? (k.admin ? 'Verwaltung · Admin' : 'Verwaltung') : 'Kunde', k.rolle === 'verwaltung' ? 'blau' : 'grau'), ' ', k.zweiFaktor ? marke('2FA ✓', 'gruen') : k.rolle === 'verwaltung' && marke('ohne 2FA', 'gelb')),
          h('td', { 'data-spalte': 'Person' }, person(k)),
          h('td', { 'data-spalte': 'Letzte Anmeldung' }, zeit(k.letzterLogin)),
          h('td', { class: 'vw-aktion' }, (k.rolle === 'kunde' || istAdmin()) && [
            h('button', { class: 'vw-knopf vw-knopf--klein', onclick: () => zuruecksetzen(k) }, 'Passwort zurücksetzen'), ' ',
            k.zweiFaktor && istAdmin() && [h('button', { class: 'vw-knopf vw-knopf--klein', onclick: async () => {
              if (!confirm(`Zwei-Faktor-Anmeldung für ${k.nummer} abschalten? Nötig, wenn das Handy verloren ist. Die Person richtet sie danach neu ein.`)) return;
              const a = await api('zwei-faktor-zuruecksetzen', { nummer: k.nummer });
              if (a.json?.ok) { hinweis('Zwei-Faktor zurückgesetzt'); konten = null; zeichne(); } else alert(a.json?.fehler || 'Das hat nicht geklappt.');
            } }, '2FA zurücksetzen'), ' '],
            h('button', { class: 'vw-knopf vw-knopf--klein vw-knopf--gefahr', onclick: async () => {
              if (!confirm(`Zugang ${k.nummer} (${person(k)}) wirklich löschen? Die Person kann sich dann nicht mehr anmelden.`)) return;
              const a = await api('konto-loeschen', { nummer: k.nummer });
              if (a.json?.ok) { hinweis('Zugang gelöscht'); konten = null; zeichne(); } else alert(a.json?.fehler || 'Der Zugang konnte nicht gelöscht werden.');
            } }, 'Löschen')])))
        : [h('tr', {}, h('td', { colspan: 5, class: 'vw-leer' }, 'Noch keine Zugänge.'))])))));
};
