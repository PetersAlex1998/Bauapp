/**
 * DIGITALES ÜBERGABEPROTOKOLL – am Handy vor Ort ausfüllen
 * ---------------------------------------------------------------
 * Räume mit Zustand, Bemerkung und Fotos, Zählerstände, Schlüssel,
 * Vereinbarungen und Unterschriften auf dem Bildschirm. Beim Abschließen
 * werden die Zählerstände ins Objekt übernommen und die Checkliste des
 * Mietverhältnisses abgehakt. Ausdruck im Briefbogen mit Fotoanlage.
 *
 * Fotos liegen getrennt von den übrigen Daten (Server: /api/?a=datei),
 * damit das Tool beim Start nicht alle Bilder laden muss.
 */
import { dokument } from './dokument';
import { alle, finde, heute, speichere, type Satz } from './speicher';
import { api, modus } from './cloud';
import { datum, h, hinweis, routen, zeichneNeu } from './app';
import { bogen, briefInfo, werkzeug } from './ansichten2';
import { anschriftMieter, personen, wohnungText } from './ansichten10';

type Raum = { raum: string; ok?: boolean | null; notiz?: string; fotos?: string[] };
type Zaehler = { art: string; nummer?: string; stand?: string };
type Schluessel = { art: string; anzahl?: string };

const RAEUME = ['Flur / Diele', 'Wohnzimmer', 'Schlafzimmer', 'Kinderzimmer', 'Küche', 'Bad / WC', 'Balkon / Terrasse', 'Keller'];
const ZAEHLER = ['Kaltwasser', 'Warmwasser', 'Strom', 'Heizung / Wärme'];
const SCHLUESSEL = ['Haustür', 'Wohnungstür', 'Briefkasten', 'Keller'];

/* ---------- Fotos ---------- */
const neueId = () => (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).toLowerCase();
const fotoSchluessel = (id: string) => `hadie-foto-${id}`;
export function fotoSrc(id: string): string {
  if (modus() === 'server') return `/api/?a=datei&id=${encodeURIComponent(id)}`;
  try { return localStorage.getItem(fotoSchluessel(id)) ?? ''; } catch { return ''; }
}
/** Verkleinert ein Handyfoto (max. 1600 px, JPEG) – so bleiben Protokolle schnell. */
function verkleinern(datei: File): Promise<string> {
  return new Promise((ok, fehler) => {
    const leser = new FileReader();
    leser.onerror = () => fehler(new Error('lesen'));
    leser.onload = () => {
      const bild = new Image();
      bild.onerror = () => fehler(new Error('bild'));
      bild.onload = () => {
        const f = Math.min(1, 1600 / Math.max(bild.width, bild.height));
        const c = document.createElement('canvas');
        c.width = Math.round(bild.width * f); c.height = Math.round(bild.height * f);
        c.getContext('2d')!.drawImage(bild, 0, 0, c.width, c.height);
        ok(c.toDataURL('image/jpeg', 0.72));
      };
      bild.src = String(leser.result);
    };
    leser.readAsDataURL(datei);
  });
}
async function fotoSpeichern(datei: File, objektId: string): Promise<string | null> {
  const daten = await verkleinern(datei);
  const id = neueId();
  if (modus() === 'server') {
    const a = await api('datei-speichern', { id, objektId, daten });
    if (!a.json?.ok) { alert(a.json?.fehler || 'Das Foto konnte nicht gespeichert werden. Bitte prüfen Sie die Verbindung.'); return null; }
    return id;
  }
  try { localStorage.setItem(fotoSchluessel(id), daten); return id; } catch { alert('Im Demo-Modus ist der Speicher des Browsers voll. Fotos werden erst mit dem Server dauerhaft gespeichert.'); return null; }
}
function fotoLoeschen(id: string) {
  if (modus() === 'server') void api('datei-loeschen', { id });
  else try { localStorage.removeItem(fotoSchluessel(id)); } catch { /* egal */ }
}

/* ---------- Protokoll suchen oder anlegen ---------- */
function protokoll(m: Satz, art: 'Einzug' | 'Auszug'): Satz {
  const vorhanden = alle('uebergaben').filter((u) => u.mieterId === m.id && u.art === art).sort((a, b) => String(b.datum).localeCompare(String(a.datum)))[0];
  if (vorhanden) return vorhanden;
  const einheit = finde('einheiten', m.einheitId);
  // Zählernummern aus früheren Ablesungen der Einheit übernehmen
  const nummer = (zart: string) => alle('zaehler').filter((z) => z.einheitId === m.einheitId && z.art === zart && z.nummer).sort((a, b) => String(b.datum).localeCompare(String(a.datum)))[0]?.nummer ?? '';
  // Beim Auszug: Räume und Schlüssel vom Einzugsprotokoll übernehmen
  const einzug = art === 'Auszug' ? alle('uebergaben').find((u) => u.mieterId === m.id && u.art === 'Einzug') : undefined;
  return {
    id: '', mieterId: m.id, objektId: einheit?.objektId, einheitId: m.einheitId, art,
    datum: art === 'Einzug' ? (m.beginn > heute() ? m.beginn : heute()) : (m.ende && m.ende < heute() ? m.ende : heute()),
    raeume: (einzug?.raeume as Raum[] | undefined)?.map((r) => ({ raum: r.raum, ok: null, notiz: '', fotos: [] })) ?? RAEUME.map((raum) => ({ raum, ok: null, notiz: '', fotos: [] })),
    zaehler: ZAEHLER.map((z) => ({ art: z, nummer: nummer(z), stand: '' })),
    schluessel: (einzug?.schluessel as Schluessel[] | undefined)?.map((s) => ({ art: s.art, anzahl: '' })) ?? SCHLUESSEL.map((s) => ({ art: s, anzahl: '' })),
    anwesendMieter: personen(m).join(', '), anwesendVerwaltung: '', vereinbarungen: '',
  };
}

/* ---------- Unterschrift auf dem Bildschirm ---------- */
function unterschriftFeld(titel: string, wert: string | undefined, setzen: (png: string) => void): HTMLElement {
  const c = h('canvas', { class: 'vw-unterschrift__flaeche', width: 600, height: 200, 'aria-label': `Unterschrift ${titel}` }) as HTMLCanvasElement;
  const g = c.getContext('2d')!;
  g.lineWidth = 2.6; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#12263f';
  let malt = false;
  let leer = true;
  if (wert) { const b = new Image(); b.onload = () => g.drawImage(b, 0, 0); b.src = wert; leer = false; }
  const punkt = (e: PointerEvent) => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) * (c.width / r.width), (e.clientY - r.top) * (c.height / r.height)]; };
  c.addEventListener('pointerdown', (e) => { malt = true; leer = false; c.setPointerCapture(e.pointerId); const [x, y] = punkt(e); g.beginPath(); g.moveTo(x, y); e.preventDefault(); });
  c.addEventListener('pointermove', (e) => { if (!malt) return; const [x, y] = punkt(e); g.lineTo(x, y); g.stroke(); e.preventDefault(); });
  const fertig = () => { if (!malt) return; malt = false; setzen(c.toDataURL('image/png')); };
  c.addEventListener('pointerup', fertig); c.addEventListener('pointercancel', fertig);
  return h('div', { class: 'vw-unterschrift' },
    h('div', { class: 'vw-unterschrift__kopf' }, h('strong', {}, titel),
      h('button', { type: 'button', class: 'vw-knopf vw-knopf--klein', onclick: () => { g.clearRect(0, 0, c.width, c.height); if (!leer) setzen(''); leer = true; } }, 'Löschen')),
    c);
}

/* ---------- Erfassen (Handy) ---------- */
routen.uebergabe = (mieterId, artText) => {
  const m = finde('mieter', mieterId);
  const einheit = m && finde('einheiten', m.einheitId);
  const objekt = einheit && finde('objekte', einheit.objektId);
  if (!m || !einheit || !objekt) return h('p', { class: 'vw-leer' }, 'Dieses Mietverhältnis gibt es nicht mehr.');
  const art = artText === 'auszug' ? 'Auszug' : 'Einzug';
  const p = protokoll(m, art);
  const raeume = p.raeume as Raum[];
  const zaehler = p.zaehler as Zaehler[];
  const schluessel = p.schluessel as Schluessel[];
  const speichern = (teil: Partial<Satz> = {}) => {
    Object.assign(p, teil);
    const fertig = speichere('uebergaben', { ...p, id: p.id || undefined, raeume, zaehler, schluessel });
    p.id = fertig.id;
  };
  const eingabe = (wert: string, setzen: (v: string) => void, extra: Record<string, any> = {}) =>
    h('input', { value: wert ?? '', oninput: (e: Event) => setzen((e.target as HTMLInputElement).value), onchange: (e: Event) => { setzen((e.target as HTMLInputElement).value); speichern(); }, ...extra });

  const raumKarte = (r: Raum, i: number): HTMLElement => {
    const fotos = h('div', { class: 'vw-fotos' });
    const zeigeFotos = () => fotos.replaceChildren(...(r.fotos ?? []).map((id) => h('figure', {},
      h('img', { src: fotoSrc(id), alt: `Foto ${r.raum}`, loading: 'lazy' }),
      h('button', { type: 'button', class: 'vw-fotos__weg', 'aria-label': 'Foto entfernen', onclick: () => { if (!confirm('Foto entfernen?')) return; r.fotos = (r.fotos ?? []).filter((x) => x !== id); fotoLoeschen(id); speichern(); zeigeFotos(); } }, '×'))));
    zeigeFotos();
    const datei = h('input', { type: 'file', accept: 'image/*', capture: 'environment', multiple: true, class: 'sr-only', id: `foto-${i}`,
      onchange: async (e: Event) => {
        const el = e.target as HTMLInputElement;
        for (const f of Array.from(el.files ?? [])) {
          const id = await fotoSpeichern(f, objekt.id);
          if (id) { r.fotos = [...(r.fotos ?? []), id]; speichern(); zeigeFotos(); }
        }
        el.value = '';
      } }) as HTMLInputElement;
    const zustand = (wert: boolean, text: string) => h('button', { type: 'button', class: `vw-wahl ${r.ok === wert ? 'ist-aktiv' : ''} ${wert ? 'vw-wahl--gut' : 'vw-wahl--mangel'}`, 'aria-pressed': String(r.ok === wert),
      onclick: () => { r.ok = r.ok === wert ? null : wert; speichern(); zeichneNeu(); } }, text);
    return h('section', { class: `vw-karte vw-raum ${r.ok === false ? 'vw-raum--mangel' : r.ok ? 'vw-raum--gut' : ''}` },
      h('header', { class: 'vw-karte__kopf' },
        h('input', { class: 'vw-raum__name', value: r.raum, 'aria-label': 'Raum', onchange: (e: Event) => { r.raum = (e.target as HTMLInputElement).value; speichern(); } }),
        h('button', { type: 'button', class: 'vw-knopf vw-knopf--klein', onclick: () => { if (!confirm(`Raum „${r.raum}“ entfernen?`)) return; (r.fotos ?? []).forEach(fotoLoeschen); raeume.splice(i, 1); speichern(); zeichneNeu(); } }, 'Entfernen')),
      h('div', { class: 'vw-innen vw-raum__inhalt' },
        h('div', { class: 'vw-wahlgruppe' }, zustand(true, '✓ In Ordnung'), zustand(false, '! Mängel')),
        h('textarea', { rows: 2, placeholder: r.ok === false ? 'Welche Mängel? (z. B. Kratzer Parkett am Fenster, Dübellöcher)' : 'Bemerkung (optional)', 'aria-label': `Bemerkung ${r.raum}`,
          oninput: (e: Event) => { r.notiz = (e.target as HTMLTextAreaElement).value; }, onchange: (e: Event) => { r.notiz = (e.target as HTMLTextAreaElement).value; speichern(); } }, r.notiz ?? ''),
        fotos,
        h('label', { class: 'vw-knopf vw-knopf--klein', for: `foto-${i}` }, '📷 Foto aufnehmen'), datei));
  };

  const abschliessen = () => {
    if (raeume.some((r) => r.ok == null) && !confirm('Nicht bei allen Räumen ist der Zustand gewählt. Trotzdem abschließen?')) return;
    if ((!p.sigMieter || !p.sigVerwaltung) && !confirm('Es fehlt noch eine Unterschrift. Trotzdem abschließen? (Sie können auch auf dem Ausdruck unterschreiben.)')) return;
    for (const z of zaehler) if (String(z.stand ?? '').trim()) speichere('zaehler', { objektId: objekt.id, einheitId: einheit.id, art: ZAEHLER.includes(z.art) ? z.art : 'Sonstiges', nummer: z.nummer, datum: p.datum, stand: Number(String(z.stand).replace(',', '.')) || z.stand });
    const s = { ...(m.schritte ?? {}) };
    if (art === 'Einzug') { s.uebergabe = p.datum; if (zaehler.some((z) => z.stand)) s.zaehler = p.datum; }
    else { s.auszugUebergabe = p.datum; if (zaehler.some((z) => z.stand)) s.auszugZaehler = p.datum; if (schluessel.some((x) => x.anzahl)) s.schluesselZurueck = p.datum; }
    const schluesselText = schluessel.filter((x) => x.anzahl).map((x) => `${x.anzahl} × ${x.art}`).join(', ');
    speichere('mieter', { id: m.id, schritte: s, ...(art === 'Einzug' && schluesselText ? { schluessel: schluesselText } : {}) });
    speichern({ abgeschlossen: heute() });
    hinweis('Protokoll abgeschlossen – Zählerstände übernommen, Checkliste aktualisiert');
    location.hash = `#/uebergabedruck/${p.id}`;
  };

  return h('div', { class: 'vw-stapel vw-protokoll' },
    h('header', { class: 'vw-seitenkopf' },
      h('p', { class: 'vw-pfad' }, h('a', { href: `#/mietverhaeltnis/${m.id}` }, `← ${m.name}`)),
      h('h1', {}, `Übergabe · ${art}`),
      h('p', {}, `${objekt.bezeichnung} · ${einheit.bezeichnung}${einheit.lage ? ` (${einheit.lage})` : ''}`),
      p.abgeschlossen && h('p', { class: 'vw-hinweisbox' }, `Abgeschlossen am ${datum(p.abgeschlossen)}. Änderungen sind möglich und werden gespeichert. `, h('a', { href: `#/uebergabedruck/${p.id}` }, 'Protokoll ansehen'))),
    h('section', { class: 'vw-karte' }, h('div', { class: 'vw-innen vw-form__felder' },
      h('div', { class: 'feld' }, h('label', { for: 'ue-datum' }, 'Übergabe am'), eingabe(p.datum, (v) => (p.datum = v), { id: 'ue-datum', type: 'date' })),
      h('div', { class: 'feld' }, h('label', { for: 'ue-mieter' }, 'Anwesend für den Mieter'), eingabe(p.anwesendMieter, (v) => (p.anwesendMieter = v), { id: 'ue-mieter' })),
      h('div', { class: 'feld' }, h('label', { for: 'ue-vw' }, 'Anwesend für die Verwaltung'), eingabe(p.anwesendVerwaltung, (v) => (p.anwesendVerwaltung = v), { id: 'ue-vw' })))),
    h('h2', { class: 'vw-zwischentitel' }, 'Räume'),
    ...raeume.map(raumKarte),
    h('button', { type: 'button', class: 'vw-knopf', onclick: () => { const n = prompt('Name des Raums', 'Abstellraum'); if (n) { raeume.push({ raum: n, ok: null, notiz: '', fotos: [] }); speichern(); zeichneNeu(); } } }, '+ Raum'),
    h('section', { class: 'vw-karte' }, h('header', { class: 'vw-karte__kopf' }, h('h2', {}, 'Zählerstände')),
      h('div', { class: 'vw-innen vw-zeilen' }, zaehler.map((z) => h('div', { class: 'vw-zeile3' },
        h('strong', {}, z.art),
        eingabe(z.nummer ?? '', (v) => (z.nummer = v), { placeholder: 'Zählernummer', 'aria-label': `${z.art} Zählernummer` }),
        eingabe(z.stand ?? '', (v) => (z.stand = v), { placeholder: 'Stand', inputmode: 'decimal', 'aria-label': `${z.art} Stand` }))),
        h('button', { type: 'button', class: 'vw-knopf vw-knopf--klein', onclick: () => { const n = prompt('Welcher Zähler?', 'Gas'); if (n) { zaehler.push({ art: n }); speichern(); zeichneNeu(); } } }, '+ Zähler'))),
    h('section', { class: 'vw-karte' }, h('header', { class: 'vw-karte__kopf' }, h('h2', {}, art === 'Einzug' ? 'Übergebene Schlüssel' : 'Zurückgegebene Schlüssel')),
      h('div', { class: 'vw-innen vw-zeilen' }, schluessel.map((s) => h('div', { class: 'vw-zeile2' },
        h('strong', {}, s.art), eingabe(s.anzahl ?? '', (v) => (s.anzahl = v), { placeholder: 'Anzahl', inputmode: 'numeric', 'aria-label': `${s.art} Anzahl` }))),
        h('button', { type: 'button', class: 'vw-knopf vw-knopf--klein', onclick: () => { const n = prompt('Welcher Schlüssel?', 'Garage'); if (n) { schluessel.push({ art: n }); speichern(); zeichneNeu(); } } }, '+ Schlüssel'))),
    h('section', { class: 'vw-karte' }, h('header', { class: 'vw-karte__kopf' }, h('h2', {}, 'Vereinbarungen')),
      h('div', { class: 'vw-innen' }, h('textarea', { rows: 3, placeholder: 'z. B. Mieter beseitigt die Dübellöcher bis 15.03.; Küche wird mit übernommen', 'aria-label': 'Vereinbarungen',
        onchange: (e: Event) => { p.vereinbarungen = (e.target as HTMLTextAreaElement).value; speichern(); } }, p.vereinbarungen ?? ''))),
    h('section', { class: 'vw-karte' }, h('header', { class: 'vw-karte__kopf' }, h('h2', {}, 'Unterschriften')),
      h('div', { class: 'vw-innen vw-unterschriften' },
        unterschriftFeld('Mieter', p.sigMieter, (png) => speichern({ sigMieter: png })),
        unterschriftFeld('Verwaltung', p.sigVerwaltung, (png) => speichern({ sigVerwaltung: png })))),
    h('div', { class: 'vw-reihe vw-protokoll__fuss' },
      p.id && h('a', { class: 'vw-knopf', href: `#/uebergabedruck/${p.id}` }, 'Vorschau'),
      h('span', { class: 'vw-platz' }),
      h('button', { type: 'button', class: 'vw-knopf vw-knopf--voll', onclick: abschliessen }, 'Abschließen & Protokoll')),
    h('p', { class: 'vw-fein' }, 'Alles wird beim Verlassen eines Feldes gespeichert. Fotos werden verkleinert und nur für die Verwaltung gespeichert.'));
};

/* ---------- Ausdruck ---------- */
routen.uebergabedruck = (id) => {
  const p = finde('uebergaben', id);
  const m = p && finde('mieter', p.mieterId);
  const einheit = m && finde('einheiten', m.einheitId);
  const objekt = einheit && finde('objekte', einheit.objektId);
  if (!p || !m || !einheit || !objekt) return h('p', { class: 'vw-leer' }, 'Dieses Protokoll gibt es nicht mehr.');
  const raeume = (p.raeume ?? []) as Raum[];
  const zaehler = ((p.zaehler ?? []) as Zaehler[]).filter((z) => z.nummer || z.stand);
  const schluessel = ((p.schluessel ?? []) as Schluessel[]).filter((s) => s.anzahl);
  const fotos = raeume.flatMap((r) => (r.fotos ?? []).map((f, i) => ({ f, text: `${r.raum} ${i + 1}` })));
  const sig = (png: string | undefined, text: string) => h('div', { class: 'din__unterschrift' }, png ? h('img', { src: png, alt: `Unterschrift ${text}` }) : h('span', { class: 'din__unterschrift-leer' }), h('span', {}, text));
  return h('div', { class: 'vw-stapel' },
    werkzeug(`#/mietverhaeltnis/${m.id}`, h('a', { class: 'vw-knopf', href: `#/uebergabe/${m.id}/${String(p.art).toLowerCase()}` }, 'Bearbeiten')),
    dokument(`Wohnungsübergabeprotokoll – ${p.art}`, `${objekt.bezeichnung} · ${einheit.bezeichnung} · Übergabe am ${datum(p.datum)}`,
      h('p', {}, `Übergabe ${wohnungText(einheit).replace(/^die /, 'der ')}, ${[objekt.strasse, objekt.ort].filter(Boolean).join(', ')}. Anwesend: ${[p.anwesendMieter && `${p.anwesendMieter} (Mieter)`, p.anwesendVerwaltung && `${p.anwesendVerwaltung} (Verwaltung)`].filter(Boolean).join(', ') || '–'}.`),
      h('h3', { class: 'din__para' }, 'Zustand der Räume'),
      h('table', { class: 'vw-brief__tabelle din__protokoll' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Raum'), h('th', {}, 'Zustand'), h('th', {}, 'Bemerkungen'))),
        h('tbody', {}, raeume.map((r) => h('tr', {}, h('td', {}, r.raum), h('td', {}, r.ok === true ? 'in Ordnung' : r.ok === false ? 'Mängel' : '–'),
          h('td', {}, r.notiz || '', (r.fotos ?? []).length ? h('span', { class: 'din__fotohinweis' }, ` (${(r.fotos ?? []).length} Foto${(r.fotos ?? []).length > 1 ? 's' : ''})`) : ''))))),
      ...(zaehler.length > 0 ? [h('h3', { class: 'din__para' }, 'Zählerstände'),
        h('table', { class: 'vw-brief__tabelle' }, h('thead', {}, h('tr', {}, h('th', {}, 'Zähler'), h('th', {}, 'Zählernummer'), h('th', { class: 'vw-zahlspalte' }, 'Stand'))),
          h('tbody', {}, zaehler.map((z) => h('tr', {}, h('td', {}, z.art), h('td', {}, z.nummer || '–'), h('td', { class: 'vw-zahlspalte' }, z.stand || '–')))))] : []),
      ...(schluessel.length > 0 ? [h('h3', { class: 'din__para' }, p.art === 'Einzug' ? 'Übergebene Schlüssel' : 'Zurückgegebene Schlüssel'),
        h('p', {}, schluessel.map((s) => `${s.anzahl} × ${s.art}`).join(' · '))] : []),
      ...(p.vereinbarungen ? [h('h3', { class: 'din__para' }, 'Vereinbarungen'), h('p', { class: 'din__vereinbart' }, p.vereinbarungen)] : []),
      h('p', {}, 'Die Beteiligten bestätigen mit ihrer Unterschrift den festgehaltenen Zustand.'),
      h('div', { class: 'din__unterschriften' }, sig(p.sigMieter, `Mieter (${p.anwesendMieter || m.name})`), sig(p.sigVerwaltung, `Verwaltung${p.anwesendVerwaltung ? ` (${p.anwesendVerwaltung})` : ''}`)),
      fotos.length > 0 && h('div', { class: 'din__fotoanlage' }, h('h3', { class: 'din__para' }, `Anlage: Fotos (${fotos.length})`),
        h('div', { class: 'din__fotoraster' }, fotos.map((x) => h('figure', {}, h('img', { src: fotoSrc(x.f), alt: x.text }), h('figcaption', {}, x.text)))))));
};
