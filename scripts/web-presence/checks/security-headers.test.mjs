import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { expectedSecurityHeaders } from '../../lib/expected-headers.mjs';
import { createContext } from '../context.mjs';
import { json, ORIGIN, routeFetch, text } from '../testing/fakes.mjs';
import { headerProblems, run } from './security-headers.mjs';

const HEADERS_FILE = readFileSync('public/_headers', 'utf8');
const expected = expectedSecurityHeaders(HEADERS_FILE);
const OBSERVATORY = 'https://observatory-api.mdn.mozilla.net/api/v2/scan';
const good = { grade: 'A+', score: 145, tests_failed: 0, error: null };
const ctx = (routes) =>
  createContext({}, { fetch: routeFetch(routes), readFile: async () => HEADERS_FILE });
const servedWith = (drop = []) =>
  text('<html>', 200, Object.fromEntries([...expected].filter(([name]) => !drop.includes(name))));

describe('security-headers', () => {
  it('réussit avec les en-têtes exacts de public/_headers et une note A+', async () => {
    const outcome = await run(
      ctx([
        [`${ORIGIN}/fr/`, servedWith()],
        [OBSERVATORY, json(good)],
      ]),
    );
    expect(outcome).toMatchObject({
      status: 'ok',
      notes: ['Observatory : A+ (145 points, 0 test(s) en échec)'],
    });
  });

  it('échoue quand un en-tête manque', async () => {
    const outcome = await run(
      ctx([
        [`${ORIGIN}/fr/`, servedWith(['strict-transport-security'])],
        [OBSERVATORY, json(good)],
      ]),
    );
    expect(outcome.problems).toEqual([
      'en-tête manquant ou différent de public/_headers : strict-transport-security',
    ]);
  });

  it('échoue sous la note A', async () => {
    const outcome = await run(
      ctx([
        [`${ORIGIN}/fr/`, servedWith()],
        [OBSERVATORY, json({ ...good, grade: 'B+' })],
      ]),
    );
    expect(outcome.problems).toEqual(['Observatory : note B+ (A minimum)']);
  });

  it('avertit, sans échouer, quand l’Observatory est indisponible', async () => {
    const outcome = await run(
      ctx([
        [`${ORIGIN}/fr/`, servedWith()],
        [OBSERVATORY, text('', 503)],
      ]),
    );
    expect(outcome.status).toBe('warn');
  });

  it('échoue quand la page est injoignable', async () => {
    expect((await run(ctx([[OBSERVATORY, json(good)]]))).problems).toEqual(['/fr/ : statut 404']);
  });
});

describe('headerProblems', () => {
  it('compare les valeurs exactes', () => {
    const wrong = new Headers({ 'x-frame-options': 'SAMEORIGIN' });
    expect(headerProblems(new Map([['x-frame-options', 'DENY']]), wrong)).toHaveLength(1);
  });
});
