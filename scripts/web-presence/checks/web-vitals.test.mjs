import { describe, expect, it } from 'vitest';
import { createContext } from '../context.mjs';
import { json, routeFetch } from '../testing/fakes.mjs';
import { judge, run } from './web-vitals.mjs';

const metrics = (lcp, inp, cls) => ({
  largest_contentful_paint: { percentiles: { p75: lcp } },
  interaction_to_next_paint: { percentiles: { p75: inp } },
  cumulative_layout_shift: { percentiles: { p75: cls } },
});
const CRUX = 'https://chromeuxreport.googleapis.com';
const ctx = (fetch, env = { GOOGLE_API_KEY: 'cle-de-test' }) => createContext(env, { fetch });
const bodyOf = (init) => JSON.parse(init.body);

describe('web-vitals', () => {
  it('se désactive sans clé API : « non configuré », aucun appel', async () => {
    const calls = [];
    const outcome = await run(ctx(routeFetch([], calls), {}));
    expect(outcome).toMatchObject({ status: 'skipped' });
    expect(calls).toEqual([]);
  });

  it('réussit sous les seuils (CLS renvoyé en chaîne) et envoie la clé en en-tête', async () => {
    const calls = [];
    const record = (url, init) =>
      json({
        record: {
          metrics:
            bodyOf(init).formFactor === 'PHONE' ? metrics(900, 80, '0.02') : metrics(500, 40, '0'),
        },
      });
    const outcome = await run(ctx(routeFetch([[CRUX, record]], calls)));
    expect(outcome.status).toBe('ok');
    expect(outcome.notes).toContain('mobile CLS p75 = 0.02');
    for (const { url, init } of calls) {
      expect(url).not.toContain('cle-de-test');
      expect(init.headers['x-goog-api-key']).toBe('cle-de-test');
      expect(bodyOf(init).origin).toBe('https://paulperigault.fr');
    }
  });

  it('échoue quand le mobile dépasse un seuil, sans que le bureau compte', async () => {
    const record = (url, init) =>
      json({
        record: {
          metrics:
            bodyOf(init).formFactor === 'PHONE'
              ? metrics(3100, 80, '0.02')
              : metrics(5000, 900, '0.9'),
        },
      });
    const outcome = await run(ctx(routeFetch([[CRUX, record]])));
    expect(outcome.status).toBe('fail');
    expect(outcome.problems).toEqual(['mobile LCP p75 = 3100 ms (> 2500 ms)']);
  });

  it('avertit, sans échouer, quand CrUX n’a pas de données pour l’origine', async () => {
    const notFound = json({ error: { message: 'chrome ux report data not found' } }, 404);
    expect(await run(ctx(routeFetch([[CRUX, notFound]])))).toMatchObject({ status: 'warn' });
  });

  it('échoue quand l’API refuse la clé', async () => {
    const outcome = await run(
      ctx(routeFetch([[CRUX, json({ error: { message: 'API key not valid' } }, 400)]])),
    );
    expect(outcome.problems).toEqual(['CrUX mobile : HTTP 400 : API key not valid']);
  });
});

describe('judge', () => {
  it('ignore une métrique absente', () => {
    expect(judge({}, 'mobile')).toEqual({ problems: [], notes: [] });
  });
});
