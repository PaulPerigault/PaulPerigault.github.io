import { describe, expect, it } from 'vitest';
import { createContext } from '../context.mjs';
import { json, ORIGIN, routeFetch, sitemapRoutes, text } from '../testing/fakes.mjs';
import { MINI_VOCABULARY } from '../testing/mini-vocabulary.mjs';
import { parseVocabulary, VOCABULARY_URL } from '../lib/schema-org.mjs';
import { pageProblems, run } from './structured-data.mjs';

const person = {
  '@type': 'Person',
  '@id': `${ORIGIN}/#person`,
  name: 'Paul',
  url: ORIGIN,
  jobTitle: 'DevOps',
  sameAs: ['https://github.com/PaulPerigault'],
};
const site = {
  '@type': 'WebSite',
  '@id': `${ORIGIN}/#website`,
  name: 'Paul',
  url: ORIGIN,
  publisher: { '@id': `${ORIGIN}/#person` },
};
const graph = (...nodes) => ({ '@context': 'https://schema.org', '@graph': nodes });
const html = (doc) =>
  `<head><script type="application/ld+json">${JSON.stringify(doc)}</script></head>`;
const vocabulary = parseVocabulary(MINI_VOCABULARY);
const check = (doc, url = `${ORIGIN}/fr/`) =>
  pageProblems(html(doc), { url, origin: ORIGIN, vocabulary });

describe('pageProblems', () => {
  it('accepte un graphe valide dont les références sont résolues', () => {
    expect(check(graph(person, site))).toEqual([]);
  });

  it('signale type inconnu, propriété inconnue et propriété hors du type', () => {
    const bad = graph(
      { ...person, jobTitel: 'x' },
      { ...site, jobTitle: 'x' },
      { '@type': 'Persn', name: 'x' },
    );
    expect(check(bad)).toEqual([
      '$[0] : propriété inconnue de schema.org « jobTitel »',
      '$[1] : « jobTitle » ne s’applique pas à WebSite',
      '$[2] : type inconnu de schema.org « Persn »',
    ]);
  });

  it('signale @id en double, référence non résolue, URL relative, contexte et @type absents', () => {
    const bad = {
      '@context': 'https://exemple.org',
      '@graph': [person, { ...site, '@id': person['@id'], url: '/relative' }, { name: 'x' }],
    };
    expect(check(bad)).toEqual(
      expect.arrayContaining([
        '@context absent ou différent de https://schema.org',
        '$[2] : @type absent',
        `@id en double : ${person['@id']}`,
        '$[1].url : URL non absolue « /relative »',
      ]),
    );
    expect(check(graph(site))).toEqual([
      `$[0].publisher : référence @id non résolue ${ORIGIN}/#person`,
    ]);
  });

  it('signale un JSON invalide, et un profil sans JSON-LD mais pas une page légale', () => {
    const broken = '<script type="application/ld+json">{oups</script>';
    expect(pageProblems(broken, { url: `${ORIGIN}/fr/`, origin: ORIGIN, vocabulary })).toEqual([
      'bloc JSON-LD n° 1 : JSON invalide',
    ]);
    expect(
      pageProblems('<head></head>', { url: `${ORIGIN}/en/`, origin: ORIGIN, vocabulary }),
    ).toEqual(['aucun JSON-LD (page de profil)']);
    expect(
      pageProblems('<head></head>', { url: `${ORIGIN}/fr/legal/`, origin: ORIGIN, vocabulary }),
    ).toEqual([]);
  });
});

describe('structured-data', () => {
  const pages = (body) => [
    ...sitemapRoutes([`${ORIGIN}/fr/`, `${ORIGIN}/fr/legal/`]),
    [`${ORIGIN}/fr/legal/`, text('<head></head>')],
    [`${ORIGIN}/fr/`, text(body)],
  ];
  const ctx = (routes) => createContext({}, { fetch: routeFetch(routes) });

  it('réussit avec le vocabulaire en ligne', async () => {
    const outcome = await run(
      ctx([[VOCABULARY_URL, json(MINI_VOCABULARY)], ...pages(html(graph(person, site)))]),
    );
    expect(outcome).toMatchObject({ status: 'ok', notes: ['2 page(s) contrôlée(s)'] });
  });

  it('échoue avec l’URL de la page dans chaque message', async () => {
    const bad = html(graph({ ...person, jobTitel: 'x' }));
    const outcome = await run(ctx([[VOCABULARY_URL, json(MINI_VOCABULARY)], ...pages(bad)]));
    expect(outcome.problems).toEqual([
      `${ORIGIN}/fr/ : $[0] : propriété inconnue de schema.org « jobTitel »`,
    ]);
  });

  it('avertit, sans échouer, quand schema.org est injoignable (contrôles structurels seuls)', async () => {
    const outcome = await run(ctx(pages(html(graph(person, site)))));
    expect(outcome.status).toBe('warn');
  });
});
