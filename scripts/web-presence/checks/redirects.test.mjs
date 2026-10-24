import { describe, expect, it } from 'vitest';
import { createContext } from '../context.mjs';
import { brokenFetch, ORIGIN, routeFetch, text } from '../testing/fakes.mjs';
import { run } from './redirects.mjs';

const moved = (to) => text('', 301, { location: to });
const GOOD = [
  ['http://paulperigault.fr/fr/', moved(`${ORIGIN}/fr/`)],
  ['https://www.paulperigault.fr/fr/', moved(`${ORIGIN}/fr/`)],
  ['https://paulperigault.dev/en/?a=1', moved(`${ORIGIN}/en/?a=1`)],
  ['https://www.paulperigault.dev/fr/', moved(`${ORIGIN}/fr/`)],
  ['https://paulperigault.pages.dev/fr/', text('<html>', 200, { 'x-robots-tag': 'noindex' })],
];
const ctx = (extra = []) => createContext({}, { fetch: routeFetch([...extra, ...GOOD]) });

describe('redirects', () => {
  it('réussit quand .dev, www et http redirigent et que pages.dev est en noindex', async () => {
    expect(await run(ctx())).toMatchObject({ status: 'ok' });
  });

  it('échoue quand .dev ne redirige plus vers .fr en conservant la requête', async () => {
    const outcome = await run(
      ctx([
        ['https://paulperigault.dev/en/', moved(`${ORIGIN}/`)],
        ['https://paulperigault.dev/en/?a=1', moved(`${ORIGIN}/en/`)],
      ]),
    );
    expect(outcome.problems).toEqual([
      `paulperigault.dev → paulperigault.fr (301, chemin conservé) : attendu 301 → ${ORIGIN}/en/?a=1`,
    ]);
  });

  it('échoue quand pages.dev sert la page sans noindex', async () => {
    const outcome = await run(ctx([['https://paulperigault.pages.dev/fr/', text('<html>', 200)]]));
    expect(outcome.problems).toEqual(['pages.dev sert la page sans X-Robots-Tag: noindex']);
  });

  it.each([[text('', 404)], [moved(`${ORIGIN}/fr/`)]])(
    'admet un pages.dev qui ne sert plus la page',
    async (answer) => {
      const outcome = await run(ctx([['https://paulperigault.pages.dev/fr/', answer]]));
      expect(outcome.status).toBe('ok');
    },
  );

  it('échoue, sans lever, quand le réseau est en panne', async () => {
    const outcome = await run(createContext({}, { fetch: brokenFetch }));
    expect(outcome.status).toBe('fail');
    expect(outcome.problems[0]).toContain('injoignable (ENOTFOUND)');
  });
});
