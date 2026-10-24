// Liens cassés, internes et externes, sur chaque page du sitemap (HTML en ligne, pas dist/ : ce
// qu'un visiteur ou un robot suit réellement). Interne : 200 exigé, ancres comprises. Externe :
// 404, 410, erreur serveur ou hôte injoignable. Un site qui bloque les robots (403, 429, 999) n'est
// pas un lien cassé : il est signalé en note, comme l'exclusion de LinkedIn dans lychee.toml.
import { linksOf } from '../lib/html.mjs';
import { request } from '../lib/http.mjs';
import { mapLimit } from '../lib/pool.mjs';
import { fromProblems } from '../lib/result.mjs';

export const id = 'links';
export const title = 'Liens cassés (internes et externes)';

const CONCURRENCY = 6;
const RETRIES = 1;
const SKIPPED_SCHEME = /^(?:mailto|tel|javascript|data):/i;
const BOT_BLOCKED = new Set([401, 403, 429, 999]);
const BROKEN = new Set([404, 410]);
const FRAGMENT_ID = (id) => new RegExp(`\\sid="${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`);

/** @returns {Map<string, string[]>} URL absolue sans fragment → pages qui la lient */
export const collectLinks = (pages) => {
  const links = new Map();
  for (const [page, html] of pages) {
    for (const raw of linksOf(html)) {
      if (SKIPPED_SCHEME.test(raw)) continue;
      const target = new URL(raw, page);
      if (!/^https?:$/.test(target.protocol)) continue;
      const fragment = target.hash;
      target.hash = '';
      const key = fragment ? `${target.href}${fragment}` : target.href;
      links.set(key, [...(links.get(key) ?? []), page]);
    }
  }
  return links;
};

const probe = async (ctx, url) => {
  let res;
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    res = await request(ctx.fetch, url, { redirect: 'follow' });
    if (res.status !== 0 && res.status < 500 && res.status !== 429) break;
  }
  return res;
};

const verdict = (res, internal) => {
  if (res.error) return { problem: res.error };
  if (res.status === 200) return {};
  if (internal) return { problem: `statut ${res.status}` };
  if (BOT_BLOCKED.has(res.status)) return { note: `statut ${res.status} (robots bloqués)` };
  return BROKEN.has(res.status) || res.status >= 500 ? { problem: `statut ${res.status}` } : {};
};

const checkOne =
  (ctx, pages) =>
  async ([key, from]) => {
    const [url, fragment] = key.split('#');
    const internal = new URL(url).hostname === ctx.domain;
    const known = pages.get(url);
    const res = known === undefined ? await probe(ctx, url) : { status: 200, body: known };
    const { problem, note } = verdict(res, internal);
    const missing = fragment && internal && res.body && !FRAGMENT_ID(fragment).test(res.body);
    const reason = problem ?? (missing ? `ancre #${fragment} introuvable` : undefined);
    return { key, from: from[0], reason, note };
  };

export const run = async (ctx) => {
  const { urls, problems } = await ctx.sitemap();
  const fetched = await Promise.all(urls.map(async (url) => [url, await ctx.page(url)]));
  const pages = new Map(fetched.filter(([, p]) => p.status === 200).map(([u, p]) => [u, p.body]));
  const links = collectLinks(pages);
  const results = await mapLimit([...links], CONCURRENCY, checkOne(ctx, pages));
  const broken = results.filter((r) => r.reason).map((r) => `${r.from} → ${r.key} : ${r.reason}`);
  const blocked = results.filter((r) => r.note).map((r) => `${r.key} : ${r.note}`);
  return fromProblems([...problems, ...broken], [`${links.size} lien(s) distinct(s)`, ...blocked]);
};
