// Interdit tout `noindex` / `X-Robots-Tag` hors de la liste blanche documentée (noindex-allowlist.mjs).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, posix } from 'node:path';
import { describe, expect, it } from 'vitest';
import { NOINDEX_PAGES, NOINDEX_SOURCES } from './lib/noindex-allowlist.mjs';
import { headersFor, parseHeaders } from './lib/pages-headers.mjs';

const TOKEN = /noindex|x-robots-tag/i;
const ROOTS = ['src', 'public', 'worker/src', 'infra', 'astro.config.mjs'];
const SKIPPED_DIRS = new Set(['node_modules', '.terraform', 'tests']);
const TEXT_EXTENSIONS = new Set([
  '',
  '.ts',
  '.astro',
  '.mjs',
  '.json',
  '.tf',
  '.toml',
  '.txt',
  '.md',
]);
const isTest = (path) => /\.test\.|\/test\//.test(path);

const files = (path) => {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path)
    .filter((name) => !SKIPPED_DIRS.has(name))
    .flatMap((name) => files(posix.join(path, name)));
};

const sources = ROOTS.flatMap(files).filter(
  (path) => TEXT_EXTENSIONS.has(extname(path)) && !isTest(path),
);
const allowed = new Set(NOINDEX_SOURCES.map(({ file }) => file));

describe('liste blanche des noindex', () => {
  it('aucun fichier source hors liste blanche ne contient noindex ni X-Robots-Tag', () => {
    const offenders = sources.filter(
      (path) => !allowed.has(path) && TOKEN.test(readFileSync(path, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('chaque entrée de la liste blanche existe encore, contient le motif et a une raison', () => {
    for (const { file, reason } of NOINDEX_SOURCES) {
      expect(reason.length, file).toBeGreaterThan(0);
      expect(TOKEN.test(readFileSync(file, 'utf8')), `${file} est périmée`).toBe(true);
    }
    for (const { path, reason } of NOINDEX_PAGES) expect(reason.length, path).toBeGreaterThan(0);
  });

  it('public/_headers ne pose X-Robots-Tag que sur les adresses pages.dev, jamais sur le site', () => {
    const rules = parseHeaders(readFileSync('public/_headers', 'utf8'));
    const withTag = rules.filter((rule) => rule.set.some(([name]) => name === 'x-robots-tag'));
    expect(withTag.map((rule) => rule.pattern)).toEqual(['https://:project.pages.dev/*']);
    for (const path of ['/', '/fr/', '/en/', '/fr/legal/', '/404.html', '/sitemap-0.xml']) {
      expect(headersFor(rules, path).has('x-robots-tag'), path).toBe(false);
    }
  });

  it('détecte un noindex ajouté hors liste (canari)', () => {
    expect(TOKEN.test('<meta name="robots" content="noindex">')).toBe(true);
    expect(TOKEN.test('X-Robots-Tag: none')).toBe(true);
    expect(allowed.has('src/pages/[lang]/index.astro')).toBe(false);
  });
});
