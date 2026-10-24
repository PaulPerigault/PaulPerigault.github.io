import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { APIRequestContext } from '@playwright/test';

export const ORIGIN = 'https://paulperigault.fr';
const DIST = 'dist';

export const all = (text: string, pattern: RegExp) =>
  [...text.matchAll(pattern)].map((m) => m[1] ?? '');
export const canonicalOf = (html: string) => /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
export const isNoindex = (html: string) => /<meta name="robots" content="[^"]*noindex/.test(html);

/** Raisons pour lesquelles une page listée au sitemap ne serait pas indexable (vide = indexable). */
export const indexabilityProblems = (url: string, html: string): string[] => [
  ...(isNoindex(html) ? [`${url} : porte un noindex`] : []),
  ...(canonicalOf(html) === url ? [] : [`${url} : canonical ${canonicalOf(html) ?? 'absent'}`]),
];

/** Toutes les URL listées par le sitemap, en partant de l'index (ce que lit un moteur). */
export const sitemapUrls = async (request: APIRequestContext) => {
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
export const builtPages = (dir = DIST): { url: string; html: string }[] =>
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
