import { lastCommitDate } from './git-date.mjs';

// `lastmod` d'une URL = dernier commit qui touche son contenu principal, ses données structurées
// ou ses liens (ce que Google considère comme un changement significatif). Les styles, le gabarit
// commun et les tests n'en font pas partie. Les données GitHub lues au build ne sont pas datées :
// elles ne passent pas par Git.
const ROUTE = /^\/(fr|en)\/(legal\/)?$/;
const NO_TESTS = ':(exclude,glob)**/*.test.*';
// `[lang]` est un motif pour Git : `:(literal)` le lit comme un nom de dossier.
const literal = (path) => `:(literal)${path}`;

const homeSources = (lang) => [
  `src/content/${lang}`,
  `:(exclude)src/content/${lang}/legal.json`,
  literal('src/pages/[lang]/index.astro'),
  'src/components/sections',
  ':(exclude)src/components/sections/LegalDocument.astro',
  'src/assets',
  'src/config/site.ts',
  'src/lib/json-ld.ts',
  'src/lib/json-ld-lists.ts',
  'src/lib/build-json-ld.ts',
];

const legalSources = (lang) => [
  `src/content/${lang}/legal.json`,
  literal('src/pages/[lang]/legal.astro'),
  'src/components/sections/LegalDocument.astro',
  'src/config/site.ts',
];

/**
 * Sources Git (pathspecs) dont dépend le contenu d'une URL du sitemap. Une route inconnue fait
 * échouer le build : une nouvelle page doit déclarer ses sources ici.
 * @param {string} pathname
 */
export const routeSources = (pathname) => {
  const match = ROUTE.exec(pathname);
  if (match === null) {
    throw new Error(
      `sitemap : sources de ${pathname} à déclarer dans scripts/lib/sitemap-lastmod.mjs`,
    );
  }
  const [, lang, legal] = match;
  return [...(legal ? legalSources(lang) : homeSources(lang)), NO_TESTS];
};

/**
 * Date ISO du dernier changement significatif de l'URL, ou `undefined` si l'historique Git manque.
 * @param {string} pathname
 * @param {string} [cwd]
 */
export const lastmodFor = (pathname, cwd) =>
  lastCommitDate(routeSources(pathname), cwd)?.toISOString();
