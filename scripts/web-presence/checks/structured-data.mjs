// Données structurées : JSON-LD de chaque page du sitemap, valide pour schema.org. Contrôles
// structurels (lib/json-ld.mjs) puis vocabulaire (lib/schema-org.mjs, schema.org en ligne).
import { jsonLdBlocks } from '../lib/html.mjs';
import { request } from '../lib/http.mjs';
import { mapLimit } from '../lib/pool.mjs';
import { parseBlocks, structuralProblems, topNodes } from '../lib/json-ld.mjs';
import { fail, ok, warn } from '../lib/result.mjs';
import { parseVocabulary, VOCABULARY_URL, vocabularyProblems } from '../lib/schema-org.mjs';

export const id = 'structured-data';
export const title = 'Données structurées (JSON-LD, schema.org)';

const CONCURRENCY = 4;
const VOCABULARY_TIMEOUT_MS = 60_000;
/** Les pages de profil portent le JSON-LD de l'entité ; les pages légales n'en ont pas. */
const PROFILE = /^\/(?:fr|en)\/$/;

const loadVocabulary = async (ctx) => {
  const res = await request(ctx.fetch, VOCABULARY_URL, {
    redirect: 'follow',
    timeout: VOCABULARY_TIMEOUT_MS,
  });
  try {
    return res.status === 200 ? parseVocabulary(JSON.parse(res.body)) : undefined;
  } catch {
    return undefined;
  }
};

/** @returns {string[]} problèmes du JSON-LD d'une page (vide = valide) */
export const pageProblems = (html, { url, origin, vocabulary }) => {
  const blocks = jsonLdBlocks(html);
  if (blocks.length === 0) {
    return PROFILE.test(url.slice(origin.length)) ? ['aucun JSON-LD (page de profil)'] : [];
  }
  const { documents, problems } = parseBlocks(blocks);
  const vocab = vocabulary
    ? documents.flatMap((doc) =>
        topNodes(doc).flatMap((node, i) => vocabularyProblems(node, vocabulary, `$[${i}]`)),
      )
    : [];
  return [...problems, ...structuralProblems(documents, origin), ...vocab];
};

export const run = async (ctx) => {
  const { urls, problems } = await ctx.sitemap();
  const vocabulary = await loadVocabulary(ctx);
  const perPage = await mapLimit(urls, CONCURRENCY, async (url) => {
    const page = await ctx.page(url);
    if (page.status !== 200) return [`${url} : ${page.error ?? `statut ${page.status}`}`];
    return pageProblems(page.body, { url, origin: ctx.origin, vocabulary }).map(
      (p) => `${url} : ${p}`,
    );
  });
  const all = [...problems, ...perPage.flat()];
  const notes = [`${urls.length} page(s) contrôlée(s)`];
  if (all.length > 0) return fail(all, notes);
  if (!vocabulary)
    return warn([...notes, 'vocabulaire schema.org injoignable : contrôles structurels seuls']);
  return ok(notes);
};
