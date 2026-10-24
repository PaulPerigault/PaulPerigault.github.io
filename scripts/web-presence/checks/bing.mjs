// Bing : le site est-il connu, vérifié, et sans problème d'exploration ? (Bing Webmaster API, clé
// d'API créée à la main : docs/manual-steps.md). La clé voyage dans l'URL, imposé par l'API Bing :
// aucun message de ce fichier n'affiche d'URL.
import { parseJson, request } from '../lib/http.mjs';
import { fail, fromProblems, skipped } from '../lib/result.mjs';

export const id = 'bing';
export const title = 'Bing Webmaster Tools';

const API = 'https://ssl.bing.com/webmaster/api.svc/json';
const NOT_CONFIGURED = 'BING_WEBMASTER_API_KEY absent : clé Bing non configurée';
const NOT_IMPORTED = 'site absent de Bing Webmaster Tools (étape manuelle, docs/manual-steps.md)';

const failure = (res, data) =>
  res.error ?? (res.ok ? undefined : `HTTP ${res.status} : ${data?.Message ?? 'sans message'}`);

const call = async (ctx, method, params = {}) => {
  const query = new URLSearchParams({ ...params, apikey: ctx.secrets.bingApiKey });
  const res = await request(ctx.fetch, `${API}/${method}?${query}`, {
    headers: { accept: 'application/json' },
  });
  const data = parseJson(res.body);
  const error = failure(res, data);
  return { data: data?.d, error: error && `${method} : ${error}` };
};

const sameSite = (url, origin) => url?.replace(/\/$/, '') === origin;

/** @returns {string[]} un problème par URL signalée par Bing (code HTTP si connu) */
export const crawlIssueProblems = (issues) =>
  (Array.isArray(issues) ? issues : []).map(
    (issue) =>
      `Bing signale un problème d’exploration : ${issue.Url ?? 'URL inconnue'}${issue.HttpCode ? ` (HTTP ${issue.HttpCode})` : ''}`,
  );

export const run = async (ctx) => {
  if (!ctx.secrets.bingApiKey) return skipped(NOT_CONFIGURED);
  const sites = await call(ctx, 'GetUserSites');
  if (sites.error) return fail([sites.error]);
  const site = (sites.data ?? []).find((entry) => sameSite(entry.Url, ctx.origin));
  if (!site) return skipped(NOT_IMPORTED);
  if (!site.IsVerified) return fail([`${ctx.origin} importé dans Bing mais non vérifié`]);
  const issues = await call(ctx, 'GetCrawlIssues', { siteUrl: site.Url });
  if (issues.error) return fail([issues.error]);
  return fromProblems(crawlIssueProblems(issues.data), [`site ${site.Url} vérifié`]);
};
