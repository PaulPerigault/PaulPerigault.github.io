import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://paulperigault.fr',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
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
      lastmod: new Date(),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    // Jamais de script inliné par le bundler : la CSP (#76) n'autorise que des fichiers 'self'.
    build: { assetsInlineLimit: 0 },
  },
});
