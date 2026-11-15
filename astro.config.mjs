import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// PLATZHALTER: Hier die endgültige Domain eintragen (wichtig für Sitemap,
// Canonical-Links und die Vorschau in Suchmaschinen).
// Bei Netlify wird automatisch die dort eingestellte Adresse verwendet.
const DOMAIN = process.env.URL || 'https://www.hadie-immobilien.example';

export default defineConfig({
  site: DOMAIN,
  trailingSlash: 'always',
  // Skripte nie in die Seite einbetten: Voraussetzung für die strenge
  // Content-Security-Policy in netlify.toml (script-src 'self').
  vite: { build: { assetsInlineLimit: 0 } },
  integrations: [
    sitemap({
      filter: (page) => !/\/(impressum|datenschutz|404|kundenlogin|kundenbereich)\/?$/.test(page),
    }),
  ],
});
