// Redirections et doublons : HTTP → HTTPS, www → domaine canonique, .dev → .fr (301, chemin et
// requête conservés), et l'adresse *.pages.dev, jamais indexée (X-Robots-Tag: noindex).
import { redirects } from '../../lib/live-checks.mjs';
import { request } from '../lib/http.mjs';
import { fromProblems } from '../lib/result.mjs';

export const id = 'redirects';
export const title = 'Redirections .dev → .fr et doublon pages.dev';

const PAGES_DEV_PATH = '/fr/';

/** @returns {Promise<string[]>} */
const redirectProblems = async (ctx) => {
  const checks = redirects({ domain: ctx.domain, alias: ctx.alias });
  const results = await Promise.all(
    checks.map(async ({ name, url, test }) => {
      const res = await request(ctx.fetch, url);
      const problem = res.error ?? test(res);
      return problem ? `${name} : ${problem}` : null;
    }),
  );
  return results.filter(Boolean);
};

/**
 * Le doublon pages.dev peut ne plus répondre ou rediriger (rien à indexer) ; s'il sert la page, il
 * doit porter `X-Robots-Tag: noindex`.
 */
export const pagesDevProblems = (res) => {
  if (res.status !== 200) return [];
  const robots = res.headers.get('x-robots-tag') ?? '';
  return /noindex/i.test(robots) ? [] : ['pages.dev sert la page sans X-Robots-Tag: noindex'];
};

export const run = async (ctx) => {
  const duplicate = await request(ctx.fetch, `https://${ctx.pagesDev}${PAGES_DEV_PATH}`);
  return fromProblems(
    [...(await redirectProblems(ctx)), ...pagesDevProblems(duplicate)],
    [`pages.dev : ${duplicate.error ?? `statut ${duplicate.status}`}`],
  );
};
