import { describe, expect, it } from 'vitest';
import { createContext } from '../context.mjs';
import { brokenFetch, ORIGIN, routeFetch, sitemapRoutes, text } from '../testing/fakes.mjs';
import { collectLinks, run } from './links.mjs';

const FR = `${ORIGIN}/fr/`;
const page = (...hrefs) =>
  hrefs.map((href) => `<a href="${href}">x</a>`).join('') + '<h2 id="projects">p</h2>';
const ctx = (routes) =>
  createContext({}, { fetch: routeFetch([...sitemapRoutes([FR]), ...routes]) });

describe('collectLinks', () => {
  it('résout les liens relatifs, ignore mailto/tel et regroupe les doublons', () => {
    const html = page(
      '/en/',
      'mailto:a@b.fr',
      'tel:+33',
      '#projects',
      'https://github.com/x',
      '/en/',
    );
    const links = collectLinks(new Map([[FR, html]]));
    expect([...links.keys()]).toEqual([`${ORIGIN}/en/`, `${FR}#projects`, 'https://github.com/x']);
    expect(links.get(`${ORIGIN}/en/`)).toEqual([FR, FR]);
  });
});

describe('links', () => {
  it('réussit quand les liens internes, les ancres et les liens externes répondent', async () => {
    const outcome = await run(
      ctx([
        [FR, text(page('/en/', '#projects', 'https://github.com/x'))],
        [`${ORIGIN}/en/`, text('')],
        ['https://github.com/x', text('ok')],
      ]),
    );
    expect(outcome).toMatchObject({ status: 'ok', notes: ['3 lien(s) distinct(s)'] });
  });

  it('échoue pour un lien interne cassé, une ancre absente et un lien interne redirigé', async () => {
    const html = page('/introuvable/', '#absente', '/ancien/');
    const outcome = await run(
      ctx([
        [FR, text(html)],
        [`${ORIGIN}/introuvable/`, text('', 404)],
        [`${ORIGIN}/ancien/`, text('', 301)],
      ]),
    );
    expect(outcome.problems).toEqual([
      `${FR} → ${ORIGIN}/introuvable/ : statut 404`,
      `${FR} → ${FR}#absente : ancre #absente introuvable`,
      `${FR} → ${ORIGIN}/ancien/ : statut 301`,
    ]);
  });

  it('échoue pour un lien externe en 404 ou en erreur serveur, pas pour un site qui bloque les robots', async () => {
    const html = page(
      'https://a.example/mort',
      'https://b.example/panne',
      'https://www.linkedin.com/in/x',
    );
    const outcome = await run(
      ctx([
        [FR, text(html)],
        ['https://a.example', text('', 404)],
        ['https://b.example', text('', 503)],
        [
          'https://www.linkedin.com',
          () => ({ status: 999, ok: false, headers: new Headers(), text: async () => '' }),
        ],
      ]),
    );
    expect(outcome.problems).toEqual([
      `${FR} → https://a.example/mort : statut 404`,
      `${FR} → https://b.example/panne : statut 503`,
    ]);
    expect(outcome.notes).toContain('https://www.linkedin.com/in/x : statut 999 (robots bloqués)');
  });

  it('échoue pour un hôte externe injoignable', async () => {
    const calls = [];
    const fetch = async (url, init) => {
      calls.push(String(url));
      return String(url).startsWith('https://mort.example')
        ? brokenFetch()
        : routeFetch([...sitemapRoutes([FR]), [FR, text(page('https://mort.example/'))]])(
            url,
            init,
          );
    };
    const outcome = await run(createContext({}, { fetch }));
    expect(outcome.problems).toEqual([`${FR} → https://mort.example/ : injoignable (ENOTFOUND)`]);
    expect(calls.filter((url) => url.startsWith('https://mort.example'))).toHaveLength(2);
  });
});
