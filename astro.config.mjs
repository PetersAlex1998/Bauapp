import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// PLATZHALTER: Hier die endgültige Domain eintragen (wichtig für Sitemap,
// Canonical-Links und die Vorschau in Suchmaschinen).
const DOMAIN = 'https://www.hadie-immobilien.example';

export default defineConfig({
  site: DOMAIN,
  trailingSlash: 'always',
  integrations: [
    sitemap({
      filter: (page) => !/\/(impressum|datenschutz|404)\/?$/.test(page),
    }),
  ],
});
