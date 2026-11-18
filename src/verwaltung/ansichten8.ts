/**
 * ADMINISTRATION: Unternehmen (Stammdaten, Logo, Bankverbindungen)
 * ---------------------------------------------------------------
 * Nur Admin-Zugänge dürfen hier ändern; der Server prüft das zusätzlich.
 * Das Logo wird im Browser verkleinert (max. 800 × 300 px, PNG) und als Teil
 * der Unternehmensdaten gespeichert. Es erscheint im Briefkopf aller Schreiben,
 * Rechnungen und Berichte.
 */
import { alle, speichere, type Satz } from './speicher';
import { istAdmin, modus } from './cloud';
import { formular, h, hinweis, liste, routen } from './app';
import './ansichten5';
import { absender, bogen, kontoText, rechnungskonten } from './ansichten2';

export const darfAdmin = () => modus() !== 'server' || istAdmin();
export const nurFuerAdmin = (titel: string) => h('div', { class: 'vw-stapel' },
  h('header', { class: 'vw-seitenkopf' }, h('h1', {}, titel)),
  h('section', { class: 'vw-karte vw-text' }, h('h2', {}, 'Nur für Admin-Zugänge'),
    h('p', {}, 'Diesen Bereich können nur Admin-Zugänge (Inhaber) öffnen. Wenden Sie sich bei Bedarf an die Geschäftsführung.')));

/** Bild verkleinern und als PNG-Daten-URL zurückgeben */
async function logoLesen(datei: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp|svg\+xml|gif)$/.test(datei.type)) throw new Error('Bitte eine Bilddatei wählen (PNG, JPG, WebP oder SVG).');
  if (datei.size > 8 * 1024 * 1024) throw new Error('Die Datei ist größer als 8 MB.');
  const url = URL.createObjectURL(datei);
  try {
    const bild = await new Promise<HTMLImageElement>((ok, fehler) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => fehler(new Error('Das Bild konnte nicht gelesen werden.')); i.src = url; });
    const w0 = bild.naturalWidth || 800, h0 = bild.naturalHeight || 300;
    const f = Math.min(1, 800 / w0, 300 / h0);
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w0 * f)); c.height = Math.max(1, Math.round(h0 * f));
    c.getContext('2d')!.drawImage(bild, 0, 0, c.width, c.height);
    const daten = c.toDataURL('image/png');
    if (daten.length > 700_000) throw new Error('Das Logo ist auch verkleinert noch sehr groß. Bitte eine einfachere Datei verwenden (z. B. PNG mit wenigen Farben).');
    return daten;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function zeile(label: string, wert?: string) {
  return [h('dt', {}, label), h('dd', {}, wert || h('span', { class: 'vw-fein' }, '–'))];
}

routen.unternehmen = () => {
  if (!darfAdmin()) return nurFuerAdmin('Unternehmen');
  const vorhanden = alle('absender')[0];
  const a: Satz = vorhanden ?? absender();
  const bearbeiten = () => formular('absender', vorhanden ?? { ...a, id: undefined });
  const datei = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/svg+xml', class: 'sr-only', id: 'vw-logo', onchange: async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    try {
      const logo = await logoLesen(f);
      if (vorhanden) speichere('absender', { id: vorhanden.id, logo });
      else speichere('absender', { ...a, id: undefined, logo });
      hinweis('Logo gespeichert');
    } catch (fehler) { alert((fehler as Error).message); }
    (e.target as HTMLInputElement).value = '';
  } });
  const konten = rechnungskonten();
  const pflichtFehlt = [!vorhanden && 'Unternehmensdaten speichern', !a.steuernummer && !a.ustid && 'Steuernummer oder USt-IdNr.', !konten.length && 'ein Konto „Auf Rechnungen angeben“'].filter(Boolean);

  return h('div', { class: 'vw-stapel' },
    h('header', { class: 'vw-seitenkopf' }, h('h1', {}, 'Unternehmen'),
      h('p', {}, 'Ihre Stammdaten. Sie erscheinen im Briefkopf und in der Fußzeile aller Schreiben, Rechnungen und Berichte – und im Kundenbereich.')),
    pflichtFehlt.length > 0 && h('p', { class: 'vw-warnung' }, h('strong', {}, 'Für vollständige Rechnungen fehlt noch: '), pflichtFehlt.join(', '), '.'),
    h('div', { class: 'vw-zwei' },
      h('section', { class: 'vw-karte' },
        h('header', { class: 'vw-karte__kopf' }, h('h2', {}, 'Unternehmensdaten'), h('button', { class: 'vw-knopf vw-knopf--klein', onclick: bearbeiten }, vorhanden ? 'Bearbeiten' : 'Anlegen')),
        h('dl', { class: 'vw-info vw-info--innen' },
          zeile('Firma', [a.name, a.rechtsform].filter(Boolean).join(', ')),
          zeile('Inhaber/in', a.inhaber),
          zeile('Anschrift', [a.strasse, a.ort].filter(Boolean).join(', ')),
          zeile('Telefon', a.telefon), zeile('E-Mail', a.email), zeile('Website', a.website),
          zeile('Steuernummer', a.steuernummer), zeile('USt-IdNr.', a.ustid),
          zeile('Umsatzsteuer', a.kleinunternehmer ? 'Kleinunternehmer (§ 19 UStG)' : 'Regelbesteuerung'),
          zeile('Zahlungsziel', a.zahlungsziel ? `${a.zahlungsziel} Tage` : ''),
          zeile('Unterschrift', a.gruss || a.name), zeile('Fußzeile', a.fusszeile))),
      h('section', { class: 'vw-karte' },
        h('header', { class: 'vw-karte__kopf' }, h('h2', {}, 'Logo')),
        h('div', { class: 'vw-logo' },
          a.logo ? h('img', { src: a.logo, alt: 'Ihr Logo' }) : h('p', { class: 'vw-fein' }, 'Noch kein Logo hinterlegt. Ohne Logo steht der Firmenname im Briefkopf.'),
          h('p', { class: 'vw-fein' }, 'Am besten ein Querformat als PNG oder SVG mit transparentem Hintergrund. Es wird automatisch verkleinert.'),
          h('div', { class: 'vw-reihe' },
            h('label', { class: 'vw-knopf vw-knopf--voll', for: 'vw-logo' }, a.logo ? 'Logo ersetzen' : 'Logo hochladen'), datei,
            a.logo && vorhanden && h('button', { class: 'vw-knopf vw-knopf--gefahr', onclick: () => { if (confirm('Logo entfernen?')) { speichere('absender', { id: vorhanden.id, logo: '' }); hinweis('Logo entfernt'); } } }, 'Entfernen'))))),
    h('section', { class: 'vw-karte' },
      h('header', { class: 'vw-karte__kopf' }, h('h2', {}, 'Bankverbindungen')),
      h('p', { class: 'vw-fein vw-innen' }, 'Nur Unternehmenskonten und übergreifende Konten (z. B. Kautionen, Rücklage). Konten mit „Auf Rechnungen und Schreiben angeben“ erscheinen in der Fußzeile und als Zahlungsziel auf Rechnungen. ', h('strong', {}, 'Mietkonten pflegen Sie im jeweiligen Objekt'), ' (Objekt → Reiter „Verwalten“).'),
      alle('bankkonten').some((k) => k.zweck === 'Mieten / Treuhand' || k.objektId) && h('p', { class: 'vw-warnung vw-innen' }, 'Hier steht noch ein Mietkonto aus der vorigen Version. Bitte im passenden Objekt als Mietkonto anlegen und hier löschen.'),
      liste('bankkonten', { kompakt: true })),
    h('section', { class: 'vw-karte' },
      h('header', { class: 'vw-karte__kopf' }, h('h2', {}, 'So sieht Ihr Briefkopf aus')),
      h('div', { class: 'vw-innen vw-briefvorschau' },
        bogen(['Familie Beispiel', 'Beispielweg 1', '33100 Paderborn'], 'Beispiel eines Schreibens',
          h('p', {}, 'Sehr geehrte Damen und Herren,'),
          h('p', {}, 'so erscheinen Logo, Absender und Fußzeile auf Ihren Schreiben und Rechnungen.'),
          konten.length > 0 && h('p', { class: 'vw-fein' }, `Auf Rechnungen: ${konten.map(kontoText).join(' / ')}`)))));
};

// Objekt-Zuweisung gehört in die Administration
const teamSeite = routen.team;
routen.team = (...a) => (darfAdmin() ? teamSeite(...a) : nurFuerAdmin('Objekt-Zuweisung'));
