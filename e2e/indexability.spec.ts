import { expect, test } from '@playwright/test';
import { NOINDEX_PAGES } from '../scripts/lib/noindex-allowlist.mjs';
import { builtPages, indexabilityProblems, isNoindex, sitemapUrls } from './helpers/sitemap';

const GOOD = '<link rel="canonical" href="https://paulperigault.fr/fr/">';
const FR = 'https://paulperigault.fr/fr/';

test.describe('indexabilité : le sitemap ne contient que des pages indexables', () => {
  test('le détecteur signale un noindex, un autre canonical et un canonical absent', () => {
    expect(indexabilityProblems(FR, GOOD)).toEqual([]);
    expect(indexabilityProblems(FR, `<meta name="robots" content="noindex">${GOOD}`)).toHaveLength(
      1,
    );
    expect(
      indexabilityProblems(FR, '<link rel="canonical" href="https://paulperigault.fr/">'),
    ).toHaveLength(1);
    expect(indexabilityProblems(FR, '<title>x</title>')).toHaveLength(1);
  });

  test('aucune URL du sitemap ne porte de noindex ni ne pointe ailleurs que vers elle-même', async ({
    request,
  }) => {
    const urls = await sitemapUrls(request);
    expect(urls.length).toBeGreaterThan(0);
    const problems: string[] = [];
    for (const url of urls) {
      const response = await request.get(new URL(url).pathname);
      expect(response.status(), url).toBe(200);
      expect(response.headers()['x-robots-tag'], url).toBeUndefined();
      problems.push(...indexabilityProblems(url, await response.text()));
    }
    expect(problems).toEqual([]);
  });
});

test.describe('noindex : liste blanche documentée', () => {
  test('les pages construites en noindex sont exactement celles de la liste blanche', () => {
    const found = builtPages()
      .filter(({ html }) => isNoindex(html))
      .map(({ url }) => url);
    expect(found.sort()).toEqual(NOINDEX_PAGES.map(({ url }) => url).sort());
  });

  test('aucune page en liste blanche n’est dans le sitemap', async ({ request }) => {
    const urls = new Set(await sitemapUrls(request));
    for (const { url } of NOINDEX_PAGES) expect(urls.has(url), url).toBe(false);
  });

  test('robots.txt n’interdit aucun chemin (un noindex doit rester lisible par les robots)', async ({
    request,
  }) => {
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).not.toMatch(/^\s*Disallow:\s*\S/im);
  });
});
