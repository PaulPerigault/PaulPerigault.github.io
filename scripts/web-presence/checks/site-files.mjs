// Fichiers d'indexation : sitemap, robots.txt, llms.txt, llms-full.txt, security.txt. Chacun doit
// être servi (200, type texte UTF-8) et cohérent avec les autres (llms ↔ sitemap ↔ profils).
import { llmsConsistencyProblems } from '../../lib/llms-consistency.mjs';
import { robotsProblem, securityTxtProblem } from '../../lib/live-checks.mjs';
import { fromProblems } from '../lib/result.mjs';

export const id = 'site-files';
export const title = 'Sitemap, robots.txt, llms.txt, llms-full.txt, security.txt';

const PLAIN_UTF8 = 'text/plain; charset=utf-8';
const LANGS = ['fr', 'en'];

const served = (name, res, type) => {
  if (res.status !== 200) return [`${name} : ${res.error ?? `statut ${res.status}`}`];
  const actual = (res.headers.get('content-type') ?? '').toLowerCase();
  return actual.startsWith(type) ? [] : [`${name} : type ${actual || 'absent'} (attendu ${type})`];
};

const text = (name, res, type = PLAIN_UTF8) => ({
  problems: served(name, res, type),
  body: res.body,
});

/** Les pages du sitemap sont toutes sur l'origine et répondent 200. */
const sitemapPageProblems = async (ctx, urls) => {
  const foreign = urls.filter((url) => !url.startsWith(`${ctx.origin}/`));
  const pages = await Promise.all(urls.map((url) => ctx.page(url)));
  return [
    ...foreign.map((url) => `sitemap : ${url} hors de ${ctx.origin}`),
    ...pages.flatMap((page, i) =>
      page.status === 200 ? [] : [`sitemap : ${urls[i]} répond ${page.error ?? page.status}`],
    ),
    ...(urls.length === 0 ? ['sitemap : aucune URL'] : []),
  ];
};

const securityProblems = (wellKnown, root, now) => {
  const a = text('/.well-known/security.txt', wellKnown, 'text/plain');
  const b = text('/security.txt', root, 'text/plain');
  const fields = a.problems.length === 0 ? [securityTxtProblem(a.body, now)].filter(Boolean) : [];
  const copy = a.problems.length + b.problems.length === 0 && a.body !== b.body;
  return [
    ...a.problems,
    ...b.problems,
    ...fields.map((p) => `security.txt : ${p}`),
    ...(copy ? ['security.txt : la copie à la racine diffère de /.well-known/'] : []),
  ];
};

export const run = async (ctx) => {
  const get = (path) => ctx.page(`${ctx.origin}${path}`);
  const [robots, llms, full, wellKnown, root, ...profiles] = await Promise.all(
    [
      '/robots.txt',
      '/llms.txt',
      '/llms-full.txt',
      '/.well-known/security.txt',
      '/security.txt',
      ...LANGS.map((l) => `/${l}/index.md`),
    ].map(get),
  );
  const { urls, problems } = await ctx.sitemap();
  const files = [text('robots.txt', robots), text('llms.txt', llms), text('llms-full.txt', full)];
  const readable =
    files.every((file) => file.problems.length === 0) && profiles.every((p) => p.status === 200);
  const robotsFault = files[0].problems.length === 0 ? robotsProblem(robots.body) : null;
  return fromProblems(
    [
      ...problems,
      ...(await sitemapPageProblems(ctx, urls)),
      ...files.flatMap((file) => file.problems),
      ...(robotsFault ? [`robots.txt : ${robotsFault}`] : []),
      ...securityProblems(wellKnown, root, ctx.now()),
      ...(readable
        ? llmsConsistencyProblems({
            origin: ctx.origin,
            llms: llms.body,
            llmsFull: full.body,
            profiles: profiles.map((p) => p.body),
            sitemapUrls: urls,
          })
        : []),
    ],
    [`${urls.length} URL au sitemap`],
  );
};
