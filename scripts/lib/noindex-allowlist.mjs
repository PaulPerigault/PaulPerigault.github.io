// Liste blanche documentée des `noindex` du site (docs/seo-audit-2026-10-24.md, docs/seo.md §9).
// Toute nouvelle page ou source `noindex` doit être ajoutée ici, avec sa raison, par une PR relue :
// `scripts/noindex-allowlist.test.mjs` (sources) et `e2e/indexability.spec.ts` (pages construites)
// échouent sinon. Aucune de ces pages ne figure dans le sitemap.
const ORIGIN = 'https://paulperigault.fr';

/** Pages construites (dist/) qui portent volontairement `<meta name="robots" content="noindex">`. */
export const NOINDEX_PAGES = [
  { path: '/404.html', reason: 'Page d’erreur : un vrai statut 404, rien à indexer.' },
  { path: '/fr/styleguide/', reason: 'Vitrine technique des primitives UI, hors résultats.' },
  { path: '/en/styleguide/', reason: 'Vitrine technique des primitives UI, hors résultats.' },
].map((page) => ({ ...page, url: `${ORIGIN}${page.path}` }));

/** Fichiers sources autorisés à écrire `noindex` ou `X-Robots-Tag`. Aucun autre ne le peut. */
export const NOINDEX_SOURCES = [
  { file: 'src/lib/seo.ts', reason: 'Constante NOINDEX, seule valeur de directive du site.' },
  { file: 'src/components/layout/SeoHead.astro', reason: 'Seul composant qui écrit la balise.' },
  { file: 'src/layouts/BaseLayout.astro', reason: 'Prop `noindex` transmise à SeoHead.' },
  { file: 'src/pages/404.astro', reason: 'Page 404 (voir NOINDEX_PAGES).' },
  { file: 'src/pages/[lang]/styleguide.astro', reason: 'Styleguide (voir NOINDEX_PAGES).' },
  {
    file: 'src/pages/index.astro',
    reason: 'Commentaire : la racine n’a justement pas de noindex.',
  },
  {
    file: 'public/_headers',
    reason: 'X-Robots-Tag sur les adresses *.pages.dev seulement (doublons du domaine canonique).',
  },
];
