import { describe, expect, it } from 'vitest';
import { createContext } from '../context.mjs';
import { ORIGIN, routeFetch, sitemapRoutes, text } from '../testing/fakes.mjs';
import { pageProblems, run } from './seo-tags.mjs';

const FR = `${ORIGIN}/fr/`;
const EN = `${ORIGIN}/en/`;
const head = ({ canonical = FR, fr = FR, en = EN, def = FR, extra = '' } = {}) =>
  [
    `<link rel="canonical" href="${canonical}">`,
    `<link rel="alternate" hreflang="fr" href="${fr}">`,
    `<link rel="alternate" hreflang="en" href="${en}">`,
    `<link rel="alternate" hreflang="x-default" href="${def}">`,
    extra,
  ].join('');
const enHead = head({ canonical: EN });
const alternates = new Map([[EN, enHead]]);

describe('pageProblems', () => {
  it('accepte une page dont canonical, hreflang et réciprocité sont corrects', () => {
    expect(pageProblems(FR, head(), alternates)).toEqual([]);
  });

  it('signale un canonical différent ou absent et un noindex', () => {
    expect(pageProblems(FR, head({ canonical: EN }), alternates)).toEqual([
      `canonical ${EN} (attendu ${FR})`,
    ]);
    expect(pageProblems(FR, head().replace(/<link rel="canonical"[^>]*>/, ''), alternates)[0]).toBe(
      `canonical absent (attendu ${FR})`,
    );
    expect(
      pageProblems(FR, head({ extra: '<meta name="robots" content="noindex">' }), alternates),
    ).toEqual(['porte un noindex']);
  });

  it('signale un hreflang manquant, un x-default qui n’est pas le français et l’auto-référence', () => {
    expect(
      pageProblems(FR, head().replace(/<link rel="alternate" hreflang="en"[^>]*>/, ''), alternates),
    ).toEqual(['hreflang en absent']);
    expect(pageProblems(FR, head({ def: EN }), alternates)).toEqual([
      `hreflang x-default (${EN}) ≠ fr`,
    ]);
    expect(
      pageProblems(FR, head({ fr: `${ORIGIN}/fr/autre/`, def: `${ORIGIN}/fr/autre/` }), alternates),
    ).toContain('hreflang sans auto-référence');
  });

  it('signale une page alternative qui ne renvoie pas vers celle-ci', () => {
    const lonely = new Map([
      [EN, head({ canonical: EN, fr: `${ORIGIN}/ailleurs/`, def: `${ORIGIN}/ailleurs/` })],
    ]);
    expect(pageProblems(FR, head(), lonely)).toEqual([`${EN} ne renvoie pas vers cette page`]);
  });
});

describe('canonical-hreflang', () => {
  const ctx = (pages) =>
    createContext({}, { fetch: routeFetch([...sitemapRoutes([FR, EN]), ...pages]) });

  it('réussit sur deux pages réciproques', async () => {
    expect(
      await run(
        ctx([
          [FR, text(head())],
          [EN, text(enHead)],
        ]),
      ),
    ).toMatchObject({ status: 'ok' });
  });

  it('échoue en préfixant chaque problème par l’URL de la page', async () => {
    const outcome = await run(
      ctx([
        [FR, text(head({ canonical: EN }))],
        [EN, text(enHead)],
      ]),
    );
    expect(outcome.problems).toEqual([`${FR} : canonical ${EN} (attendu ${FR})`]);
  });
});
