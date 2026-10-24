import { describe, expect, it } from 'vitest';
import { createContext } from '../context.mjs';
import { json, ORIGIN, PAGES, routeFetch, sitemapRoutes } from '../testing/fakes.mjs';
import { run, runsFor, scoreProblems } from './pagespeed.mjs';

const PSI = 'https://www.googleapis.com/pagespeedonline';
const report = (scores) => ({
  lighthouseResult: {
    categories: Object.fromEntries(Object.entries(scores).map(([k, score]) => [k, { score }])),
  },
});
const GOOD = { performance: 0.99, accessibility: 1, 'best-practices': 1, seo: 1 };
const ctx = (routes, calls = []) =>
  createContext(
    { GOOGLE_API_KEY: 'cle-de-test' },
    { fetch: routeFetch([...routes, ...sitemapRoutes()], calls) },
  );

describe('pagespeed', () => {
  it('se désactive sans clé API', async () => {
    const outcome = await run(createContext({}, { fetch: routeFetch([]) }));
    expect(outcome.status).toBe('skipped');
  });

  it('analyse chaque page en mobile et les accueils en bureau', () => {
    const runs = runsFor(PAGES, ORIGIN).map(
      ({ url, strategy }) => `${strategy} ${url.slice(ORIGIN.length)}`,
    );
    expect(runs).toEqual([
      'mobile /fr/',
      'desktop /fr/',
      'mobile /en/',
      'desktop /en/',
      'mobile /fr/legal/',
      'mobile /en/legal/',
    ]);
  });

  it('réussit avec de bons scores, clé en en-tête', async () => {
    const calls = [];
    const outcome = await run(ctx([[PSI, json(report(GOOD))]], calls));
    expect(outcome.status).toBe('ok');
    const psi = calls.filter(({ url }) => url.startsWith(PSI));
    expect(psi).toHaveLength(6);
    for (const { url, init } of psi) {
      expect(url).not.toContain('cle-de-test');
      expect(init.headers['x-goog-api-key']).toBe('cle-de-test');
    }
  });

  it('échoue sous le seuil de performance mobile', async () => {
    const slow = (url) =>
      json(report({ ...GOOD, performance: url.includes('strategy=mobile') ? 0.6 : 1 }));
    const outcome = await run(ctx([[PSI, slow]]));
    expect(outcome.status).toBe('fail');
    expect(outcome.problems[0]).toBe(`mobile ${ORIGIN}/fr/ : performance 0.6 (< 0.9)`);
    expect(outcome.problems.every((p) => p.startsWith('mobile '))).toBe(true);
  });

  it('échoue quand l’API répond une erreur', async () => {
    const outcome = await run(ctx([[PSI, json({ error: { message: 'Quota exceeded' } }, 429)]]));
    expect(outcome.problems[0]).toContain('HTTP 429 : Quota exceeded');
  });
});

describe('scoreProblems', () => {
  it('signale une erreur d’exécution Lighthouse et un rapport absent', () => {
    expect(scoreProblems('x', { runtimeError: { code: 'FAILED_DOCUMENT_REQUEST' } })).toEqual([
      'x : FAILED_DOCUMENT_REQUEST',
    ]);
    expect(scoreProblems('x', undefined)).toEqual(['x : aucun rapport Lighthouse']);
  });
});
