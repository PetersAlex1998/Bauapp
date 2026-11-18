/**
 * VORSCHAUBILDER (Open Graph) für jede öffentliche Seite erzeugen.
 * Ergebnis: public/og/<seite>.png (1200 × 630), das Layout nimmt sie automatisch.
 *
 * Aufruf nach einem Build:  npm run build && npm run og && npm run build
 * Braucht Playwright mit Chromium (lokal vorhanden; nicht Teil des Deployments).
 * Die PNG-Dateien werden ins Repository eingecheckt.
 */
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const DIST = 'dist';
const ZIEL = 'public/og';
const AUSLASSEN = /^(404|impressum|datenschutz|kundenlogin|kundenbereich|verwaltung|einrichtung)(\/|$)/;

const seiten = [];
(function sammle(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { if (n !== '_astro' && n !== 'api' && n !== 'og') sammle(p); }
    else if (n === 'index.html') seiten.push(p);
  }
})(DIST);

const text = (html) => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&shy;/g, '').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
export const schluessel = (pfad) => pfad.replace(/^\/|\/$/g, '').replace(/\//g, '-') || 'start';

const font = (p) => 'data:font/woff2;base64,' + readFileSync(require.resolve(p)).toString('base64');
const css = `
@font-face { font-family: F; src: url(${font('@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2')}) format('woff2'); font-weight: 100 900; }
@font-face { font-family: I; src: url(${font('@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2')}) format('woff2'); font-weight: 400 700; }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; background: #eef3f8; color: #12263f; font-family: I, sans-serif; display: flex; flex-direction: column; justify-content: space-between; padding: 72px 80px 64px; position: relative; overflow: hidden; }
.ring { position: absolute; right: -170px; top: 50%; transform: translateY(-50%); width: 560px; height: 560px; opacity: .12; }
.kicker { font-size: 26px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: #1f5fa6; display: flex; align-items: center; gap: 14px; }
.kicker::before { content: ''; width: 18px; height: 18px; border: 3px solid #1f5fa6; border-radius: 50%; }
h1 { font-family: F, serif; font-weight: 400; font-size: 72px; line-height: 1.08; letter-spacing: -.01em; max-width: 820px; margin-top: 28px; text-wrap: balance; }
h1.lang { font-size: 56px; }
.fuss { display: flex; align-items: center; gap: 20px; font-size: 26px; color: #4d5c70; }
.fuss svg { width: 56px; height: 56px; flex: none; }
.fuss b { font-family: F, serif; font-weight: 500; font-size: 32px; color: #12263f; }
`;
const ring = (stark) => `<svg viewBox="0 0 240 240" aria-hidden="true"><g transform="rotate(-88 120 120)"><circle cx="120" cy="120" r="96" fill="none" stroke="#1f5fa6" stroke-width="${stark ? 34 : 30}" stroke-dasharray="142.8 8" /></g><circle cx="120" cy="120" r="${stark ? 30 : 28}" fill="${stark ? '#12263f' : '#1f5fa6'}"/></svg>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
mkdirSync(ZIEL, { recursive: true });
let n = 0;
for (const datei of seiten) {
  const pfad = '/' + relative(DIST, datei).replace(/index\.html$/, '');
  if (AUSLASSEN.test(pfad.slice(1))) continue;
  const html = readFileSync(datei, 'utf8');
  const h1 = text((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [, ''])[1]);
  const kicker = text((html.match(/<p class="marke[^"]*"[^>]*>([\s\S]*?)<\/p>/) || [, ''])[1]) || 'HaDie-Immobilien';
  if (!h1) continue;
  const titel = pfad === '/' ? '360° Hausverwaltung für den Kreis Paderborn.' : h1;
  const marke = pfad === '/' ? 'Ein Partner für alles' : kicker;
  const seite = `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>${css}</style></head><body>
    <div class="ring">${ring(false)}</div>
    <div><p class="kicker">${marke}</p><h1 class="${titel.length > 48 ? 'lang' : ''}">${titel}</h1></div>
    <p class="fuss">${ring(true)}<span><b>HaDie-Immobilien</b><br>360° Hausverwaltung · Kreis Paderborn</span></p>
  </body></html>`;
  await page.setContent(seite, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  writeFileSync(join(ZIEL, schluessel(pfad) + '.png'), await page.screenshot({ type: 'png' }));
  n++;
}
await browser.close();
console.log(`${n} Vorschaubilder in ${ZIEL}/`);
