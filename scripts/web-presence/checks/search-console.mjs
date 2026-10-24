// Indexation par Google : état des sitemaps et inspection de chaque URL du sitemap (Search Console
// API, jeton OAuth en lecture seule obtenu par fédération d'identité, docs/manual-steps.md).
import { bearer, googleJson, SEARCH_CONSOLE, URL_INSPECTION } from '../lib/google.mjs';
import { mapLimit } from '../lib/pool.mjs';
import { fail, fromProblems, skipped } from '../lib/result.mjs';

export const id = 'search-console';
export const title = 'Indexation Google (Search Console)';

const CONCURRENCY = 3;
const STALE_SITEMAP_DAYS = 30;
const DAY_MS = 86_400_000;

const NOT_CONFIGURED = 'GOOGLE_ACCESS_TOKEN absent : fédération d’identité non configurée';
const NOT_SHARED =
  'compte de service absent de Search Console (étape manuelle, docs/manual-steps.md)';

/** Propriété Search Console du domaine parmi celles que le compte voit (domaine, sinon préfixe). */
export const pickProperty = (entries, ctx) => {
  const wanted = [ctx.env.GSC_SITE, `sc-domain:${ctx.domain}`, `${ctx.origin}/`];
  return wanted.find((site) => site && entries.some((entry) => entry.siteUrl === site));
};

const ageInDays = (sitemap, now) => (now - Date.parse(sitemap.lastDownloaded ?? '')) / DAY_MS;

/** Une règle renvoie un message (problème) ou une valeur fausse. */
const SITEMAP_RULES = [
  (sitemap) => Number(sitemap.errors) > 0 && `${sitemap.errors} erreur(s)`,
  (sitemap) => Number(sitemap.warnings) > 0 && `${sitemap.warnings} avertissement(s)`,
  (sitemap) => sitemap.isPending && 'en attente de traitement',
  (sitemap, now) =>
    ageInDays(sitemap, now) > STALE_SITEMAP_DAYS &&
    `lu par Google il y a ${Math.floor(ageInDays(sitemap, now))} jours`,
];

const sitemapProblems = (sitemaps, now) =>
  sitemaps.length === 0
    ? ['aucun sitemap soumis dans Search Console']
    : sitemaps.flatMap((sitemap) =>
        SITEMAP_RULES.map((rule) => rule(sitemap, now))
          .filter(Boolean)
          .map((problem) => `${sitemap.path} : ${problem}`),
      );

const INSPECTION_RULES = [
  (status) => status.verdict !== 'PASS' && `non indexée (${status.coverageState})`,
  (status) =>
    status.indexingState &&
    status.indexingState !== 'INDEXING_ALLOWED' &&
    `indexation bloquée (${status.indexingState})`,
  (status) =>
    status.pageFetchState &&
    status.pageFetchState !== 'SUCCESSFUL' &&
    `exploration en échec (${status.pageFetchState})`,
  (status) =>
    status.googleCanonical &&
    status.userCanonical !== status.googleCanonical &&
    `canonical retenu par Google : ${status.googleCanonical}`,
];

/** Problèmes d'une réponse `inspectionResult` pour `url` (vide = indexée et conforme). */
export const inspectionProblems = (url, result) => {
  const status = result?.indexStatusResult;
  if (!status) return [`${url} : aucun résultat d’inspection`];
  return INSPECTION_RULES.map((rule) => rule(status))
    .filter(Boolean)
    .map((problem) => `${url} : ${problem}`);
};

const inspect = (ctx, property) => async (url) => {
  const body = { inspectionUrl: url, siteUrl: property, languageCode: 'fr' };
  const res = await googleJson(ctx, URL_INSPECTION, {
    headers: bearer(ctx.secrets.googleToken),
    body,
  });
  if (res.error) return [`${url} : inspection impossible (${res.error})`];
  return inspectionProblems(url, res.data?.inspectionResult);
};

/** Propriété visible par le compte puis ses sitemaps, ou le résultat final (échec, non configuré). */
const discover = async (ctx) => {
  const headers = bearer(ctx.secrets.googleToken);
  const sites = await googleJson(ctx, `${SEARCH_CONSOLE}/sites`, { headers });
  if (sites.error) return { outcome: fail([`liste des propriétés : ${sites.error}`]) };
  const property = pickProperty(sites.data?.siteEntry ?? [], ctx);
  if (!property) return { outcome: skipped(NOT_SHARED) };
  const path = `${SEARCH_CONSOLE}/sites/${encodeURIComponent(property)}/sitemaps`;
  const sitemaps = await googleJson(ctx, path, { headers });
  if (sitemaps.error) return { outcome: fail([`sitemaps : ${sitemaps.error}`]) };
  return { property, sitemaps: sitemaps.data?.sitemap ?? [] };
};

export const run = async (ctx) => {
  if (!ctx.secrets.googleToken) return skipped(NOT_CONFIGURED);
  const found = await discover(ctx);
  if (found.outcome) return found.outcome;
  const { urls, problems } = await ctx.sitemap();
  const inspected = await mapLimit(urls, CONCURRENCY, inspect(ctx, found.property));
  return fromProblems(
    [...problems, ...sitemapProblems(found.sitemaps, ctx.now()), ...inspected.flat()],
    [`propriété ${found.property}`, `${urls.length} URL inspectées`],
  );
};
