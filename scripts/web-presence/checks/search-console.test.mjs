import { describe, expect, it } from 'vitest';
import { createContext } from '../context.mjs';
import { json, ORIGIN, routeFetch, sitemapRoutes } from '../testing/fakes.mjs';
import { inspectionProblems, run } from './search-console.mjs';

const NOW = Date.parse('2026-10-24T08:00:00Z');
const URLS = [`${ORIGIN}/fr/`, `${ORIGIN}/en/`];
const GSC = 'https://www.googleapis.com/webmasters/v3';
const SITE = 'sc-domain:paulperigault.fr';
const sitemap = {
  path: `${ORIGIN}/sitemap-index.xml`,
  errors: '0',
  warnings: '0',
  isPending: false,
};
const passFor = (url) => ({
  indexStatusResult: {
    verdict: 'PASS',
    indexingState: 'INDEXING_ALLOWED',
    googleCanonical: url,
    userCanonical: url,
  },
});
const inspected = (url, init) =>
  json({ inspectionResult: passFor(JSON.parse(init.body).inspectionUrl) });

/** Routes d'un Google sain ; `extra` passe avant (première route qui correspond). */
const google = (extra = [], calls = []) =>
  routeFetch(
    [
      ...extra,
      [
        `${GSC}/sites/`,
        json({ sitemap: [{ ...sitemap, lastDownloaded: '2026-10-20T00:00:00Z' }] }),
      ],
      [`${GSC}/sites`, json({ siteEntry: [{ siteUrl: SITE }] })],
      ['https://searchconsole.googleapis.com', inspected],
      ...sitemapRoutes(URLS),
    ],
    calls,
  );
const ctx = (fetch, token = 'jeton-de-test') =>
  createContext({ GOOGLE_ACCESS_TOKEN: token }, { fetch, now: () => NOW });

describe('search-console', () => {
  it('se désactive sans jeton : « non configuré », aucun appel, jamais un échec', async () => {
    const calls = [];
    const outcome = await run(createContext({}, { fetch: google([], calls), now: () => NOW }));
    expect(outcome).toMatchObject({ status: 'skipped' });
    expect(outcome.notes[0]).toContain('non configurée');
    expect(calls).toEqual([]);
  });

  it('se désactive tant que le compte de service n’est pas dans Search Console', async () => {
    const outcome = await run(ctx(google([[`${GSC}/sites`, json({})]])));
    expect(outcome.status).toBe('skipped');
    expect(outcome.notes[0]).toContain('manual-steps');
  });

  it('réussit si tout est indexé, avec le jeton en en-tête seulement', async () => {
    const calls = [];
    const outcome = await run(ctx(google([], calls)));
    expect(outcome).toMatchObject({
      status: 'ok',
      notes: [`propriété ${SITE}`, '2 URL inspectées'],
    });
    for (const { url, init } of calls.filter(({ url }) => url.includes('googleapis'))) {
      expect(url).not.toContain('jeton-de-test');
      expect(init.headers.authorization).toBe('Bearer jeton-de-test');
    }
  });

  it('échoue pour une URL non indexée et pour un sitemap en erreur', async () => {
    const neutral = { indexStatusResult: { verdict: 'NEUTRAL', coverageState: 'Discovered' } };
    const outcome = await run(
      ctx(
        google([
          [`${GSC}/sites/`, json({ sitemap: [{ ...sitemap, errors: '2' }] })],
          [
            'https://searchconsole.googleapis.com',
            (url, init) =>
              json({
                inspectionResult:
                  JSON.parse(init.body).inspectionUrl === URLS[0] ? passFor(URLS[0]) : neutral,
              }),
          ],
        ]),
      ),
    );
    expect(outcome.problems).toEqual([
      `${ORIGIN}/sitemap-index.xml : 2 erreur(s)`,
      `${URLS[1]} : non indexée (Discovered)`,
    ]);
  });

  it('échoue, sans exposer d’URL, quand l’API refuse le jeton', async () => {
    const refused = json({ error: { message: 'Invalid Credentials' } }, 401);
    const outcome = await run(ctx(google([[`${GSC}/sites`, refused]])));
    expect(outcome.problems).toEqual(['liste des propriétés : HTTP 401 : Invalid Credentials']);
  });
});

describe('inspectionProblems', () => {
  it('signale canonical retenu par Google, indexation bloquée et exploration en échec', () => {
    const result = {
      indexStatusResult: {
        ...passFor('https://x/autre/').indexStatusResult,
        userCanonical: URLS[0],
        indexingState: 'BLOCKED_BY_META_TAG',
        pageFetchState: 'SOFT_404',
      },
    };
    expect(inspectionProblems(URLS[0], result)).toEqual([
      `${URLS[0]} : indexation bloquée (BLOCKED_BY_META_TAG)`,
      `${URLS[0]} : exploration en échec (SOFT_404)`,
      `${URLS[0]} : canonical retenu par Google : https://x/autre/`,
    ]);
  });
});
