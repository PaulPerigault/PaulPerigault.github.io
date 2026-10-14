import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { expect, test, type APIRequestContext } from '@playwright/test';

const ORIGIN = 'https://paulperigault.fr';
const DIST = 'dist';

const all = (text: string, pattern: RegExp) => [...text.matchAll(pattern)].map((m) => m[1] ?? '');
const canonicalOf = (html: string) => /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
const isNoindex = (html: string) => /<meta name="robots" content="[^"]*noindex/.test(html);

/** Toutes les URL listées par le sitemap, en partant de l'index (ce que lit un moteur). */
const sitemapUrls = async (request: APIRequestContext) => {
  const index = await (await request.get('/sitemap-index.xml')).text();
  const files = all(index, /<loc>([^<]+)<\/loc>/g);
  const urls = await Promise.all(
    files.map(async (file) => {
      const xml = await (await request.get(new URL(file).pathname)).text();
      return all(xml, /<loc>([^<]+)<\/loc>/g);
    }),
  );
  return urls.flat();
};

/** Pages HTML de dist/ avec leur URL publique (`fr/legal/index.html` → `/fr/legal/`). */
const builtPages = (dir = DIST): { url: string; html: string }[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return builtPages(path);
    if (!entry.name.endsWith('.html')) return [];
    const route = relative(DIST, path)
      .split(sep)
      .join('/')
      .replace(/index\.html$/, '');
    return [{ url: `${ORIGIN}/${route}`, html: readFileSync(path, 'utf8') }];
  });

test.describe('cohérence du sitemap', () => {
  test('chaque URL est sur le domaine canonique, avec une barre finale, et répond 200', async ({
    request,
  }) => {
    const urls = await sitemapUrls(request);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(url, url).toMatch(new RegExp(`^${ORIGIN}/.*/$`));
      expect((await request.get(new URL(url).pathname)).status(), url).toBe(200);
    }
  });

  test('chaque URL est indexable et se déclare elle-même canonique', async ({ request }) => {
    for (const url of await sitemapUrls(request)) {
      const html = await (await request.get(new URL(url).pathname)).text();
      expect(isNoindex(html), url).toBe(false);
      expect(canonicalOf(html), url).toBe(url);
    }
  });

  test('aucune page indexable de dist/ ne manque au sitemap, et rien d’autre n’y figure', async ({
    request,
  }) => {
    // Indexable = pas de noindex ET canonique vers elle-même (la racine désigne /fr/).
    const indexable = builtPages()
      .filter(({ url, html }) => !isNoindex(html) && canonicalOf(html) === url)
      .map(({ url }) => url);
    expect([...(await sitemapUrls(request))].sort()).toEqual(indexable.sort());
  });

  test('les hreflang du sitemap sont ceux de la page', async ({ request }) => {
    const xml = await (await request.get('/sitemap-0.xml')).text();
    for (const entry of all(xml, /<url>(.*?)<\/url>/gs)) {
      const loc = /<loc>([^<]+)<\/loc>/.exec(entry)?.[1] ?? '';
      const html = await (await request.get(new URL(loc).pathname)).text();
      for (const [, lang, href] of entry.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)) {
        expect(html, `${loc} → ${lang}`).toContain(
          `<link rel="alternate" hreflang="${lang}" href="${href}">`,
        );
      }
    }
  });

  test('chaque URL a sa propre lastmod, sans changefreq ni priority (ignorés par Google)', async ({
    request,
  }) => {
    const xml = await (await request.get('/sitemap-0.xml')).text();
    const entries = all(xml, /<url>(.*?)<\/url>/gs);
    for (const entry of entries) expect(entry).toMatch(/<lastmod>[^<]+<\/lastmod>/);
    expect(xml).not.toMatch(/<changefreq>|<priority>/);
    expect(xml).not.toMatch(/xmlns:(news|image|video)=/);
  });
});
