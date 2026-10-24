// Canonical et hreflang de chaque page du sitemap : canonical = la page elle-même, jeu complet
// fr / en / x-default, auto-référence, réciprocité entre langues, aucune page en noindex.
import { canonicalOf, hasNoindex, hreflangsOf } from '../lib/html.mjs';
import { fromProblems } from '../lib/result.mjs';

export const id = 'canonical-hreflang';
export const title = 'Canonical et hreflang';

const LANGS = ['fr', 'en'];
const DEFAULT_LANG = 'fr';

const hreflangProblems = (url, hreflangs) => [
  ...[...LANGS, 'x-default']
    .filter((key) => !hreflangs.has(key))
    .map((key) => `hreflang ${key} absent`),
  ...(hreflangs.get('x-default') === hreflangs.get(DEFAULT_LANG)
    ? []
    : [`hreflang x-default (${hreflangs.get('x-default')}) ≠ ${DEFAULT_LANG}`]),
  ...([...hreflangs.values()].includes(url) ? [] : ['hreflang sans auto-référence']),
];

/** Chaque page alternative connue doit renvoyer vers celle-ci (réciprocité). */
const reciprocityProblems = (url, hreflangs, alternates) =>
  [...new Set(hreflangs.values())]
    .filter((href) => href !== url && alternates.has(href))
    .filter((href) => ![...hreflangsOf(alternates.get(href)).values()].includes(url))
    .map((href) => `${href} ne renvoie pas vers cette page`);

/** Problèmes d'une page et, pour la réciprocité, des pages vers lesquelles elle pointe. */
export const pageProblems = (url, html, alternates) => {
  const hreflangs = hreflangsOf(html);
  const canonical = canonicalOf(html);
  return [
    ...(canonical === url ? [] : [`canonical ${canonical ?? 'absent'} (attendu ${url})`]),
    ...(hasNoindex(html) ? ['porte un noindex'] : []),
    ...hreflangProblems(url, hreflangs),
    ...reciprocityProblems(url, hreflangs, alternates),
  ];
};

export const run = async (ctx) => {
  const { urls, problems } = await ctx.sitemap();
  const pages = new Map(await Promise.all(urls.map(async (url) => [url, await ctx.page(url)])));
  const bodies = new Map(
    [...pages].filter(([, p]) => p.status === 200).map(([u, p]) => [u, p.body]),
  );
  const found = [...pages].flatMap(([url, page]) =>
    page.status === 200
      ? pageProblems(url, page.body, bodies).map((p) => `${url} : ${p}`)
      : [`${url} : ${page.error ?? `statut ${page.status}`}`],
  );
  return fromProblems([...problems, ...found], [`${urls.length} page(s) contrôlée(s)`]);
};
