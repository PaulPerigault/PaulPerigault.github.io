import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { lastmodFor } from './scripts/lib/sitemap-lastmod.mjs';

export default defineConfig({
  site: 'https://paulperigault.fr',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  i18n: {
    defaultLocale: 'fr',
    locales: ['fr', 'en'],
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'fr', locales: { fr: 'fr', en: 'en' } },
      // Ni la racine (redirection) ni les pages techniques ne sont listées.
      filter: (page) => new URL(page).pathname !== '/' && !page.includes('/styleguide/'),
      // `lastmod` par URL = dernier commit qui touche SON contenu (scripts/lib/sitemap-lastmod.mjs),
      // jamais la date du build : le redéploiement hebdomadaire la changerait sans contenu nouveau,
      // et Google ignore un lastmod peu fiable. Ni changefreq ni priority : Google les ignore.
      serialize: (item) => ({ ...item, lastmod: lastmodFor(new URL(item.url).pathname) }),
      // Seul xhtml sert (hreflang) : pas d'espaces de noms news, image ni video inutilisés.
      namespaces: { news: false, image: false, video: false },
    }),
  ],
  security: {
    // CSP par balise <meta> (GitHub Pages ne sait pas envoyer d'en-têtes) : Astro calcule les
    // hashes des scripts/styles ; tout le reste est interdit par défaut. `frame-ancestors`
    // n'existe qu'en en-tête HTTP (voir nginx.conf). `connect-src 'self'` (même origine seulement) :
    // Lighthouse lit robots.txt par un fetch depuis la page ; aucun script du site n'appelle fetch.
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'none'",
        "img-src 'self'",
        "font-src 'self'",
        "connect-src 'self'",
        "manifest-src 'self'",
        "base-uri 'none'",
        "form-action 'none'",
        "object-src 'none'",
        "worker-src 'none'",
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
    // Jamais de script inliné par le bundler : la CSP (#76) n'autorise que des fichiers 'self'.
    build: { assetsInlineLimit: 0 },
  },
});
