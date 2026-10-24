// Lighthouse sur la production, mobile d'abord, via l'API PageSpeed Insights (lab, réseau et CPU
// bridés par Google). Mobile pour chaque page indexable, bureau pour les deux accueils.
import { apiKey, googleJson, PAGESPEED } from '../lib/google.mjs';
import { mapLimit } from '../lib/pool.mjs';
import { fromProblems, skipped } from '../lib/result.mjs';

export const id = 'pagespeed';
export const title = 'Lighthouse (PageSpeed Insights, mobile d’abord)';

/** Scores minimaux (0 à 1). Performance moins stricte : le lab de Google varie d'un passage à l'autre. */
export const MIN_SCORES = {
  performance: 0.9,
  accessibility: 0.95,
  'best-practices': 0.95,
  seo: 0.95,
};
const CONCURRENCY = 2;
const PSI_TIMEOUT_MS = 90_000;
const HOME = /^\/(?:fr|en)\/$/;
const NOT_CONFIGURED = 'GOOGLE_API_KEY absent : clé CrUX/PageSpeed non configurée';

/** Une exécution par (page, stratégie) : mobile partout, bureau sur les accueils. */
export const runsFor = (urls, origin) =>
  urls.flatMap((url) => [
    { url, strategy: 'mobile' },
    ...(HOME.test(url.slice(origin.length)) ? [{ url, strategy: 'desktop' }] : []),
  ]);

/** @returns {string[]} problèmes d'un rapport Lighthouse (`lighthouseResult`) */
export const scoreProblems = (label, lighthouse) => {
  if (!lighthouse) return [`${label} : aucun rapport Lighthouse`];
  if (lighthouse.runtimeError) return [`${label} : ${lighthouse.runtimeError.code}`];
  return Object.entries(MIN_SCORES)
    .filter(([category, min]) => !((lighthouse.categories?.[category]?.score ?? 0) >= min))
    .map(([category, min]) => {
      const score = lighthouse.categories?.[category]?.score;
      return `${label} : ${category} ${score ?? 'absent'} (< ${min})`;
    });
};

const analyse =
  (ctx) =>
  async ({ url, strategy }) => {
    const query = new URLSearchParams({ url, strategy });
    for (const category of Object.keys(MIN_SCORES)) query.append('category', category);
    const res = await googleJson(ctx, `${PAGESPEED}?${query}`, {
      headers: apiKey(ctx.secrets.googleApiKey),
      timeout: PSI_TIMEOUT_MS,
    });
    const label = `${strategy} ${url}`;
    if (res.error) return { problems: [`${label} : ${res.error}`], note: undefined };
    const lighthouse = res.data?.lighthouseResult;
    const perf = lighthouse?.categories?.performance?.score;
    return { problems: scoreProblems(label, lighthouse), note: `${label} : performance ${perf}` };
  };

export const run = async (ctx) => {
  if (!ctx.secrets.googleApiKey) return skipped(NOT_CONFIGURED);
  const { urls, problems } = await ctx.sitemap();
  const results = await mapLimit(runsFor(urls, ctx.origin), CONCURRENCY, analyse(ctx));
  return fromProblems(
    [...problems, ...results.flatMap((r) => r.problems)],
    results.map((r) => r.note).filter(Boolean),
  );
};
