import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { walk } from '../../scripts/lib/walk.mjs';
import { SITE } from './site';

// Nom d'hôte littéral (https://exemple.fr) ou adresse e-mail littérale : jamais hors de la config.
// (schema.org est un vocabulaire normatif, pas une adresse du site.)
const EXTERNAL = /https?:\/\/(?!schema\.org)[a-z0-9-]+(\.[a-z0-9-]+)+|[\w.-]+@[\w-]+\.[a-z]{2,}/i;
// Fichiers autorisés à contenir une URL : la source unique, la démo du styleguide, la page racine.
const ALLOWED = [
  /src\/config\/site\.ts$/,
  /styleguide\.astro$/,
  /pages\/index\.astro$/,
  /\.test\.ts$/,
  /src\/test\//,
];

describe('SITE', () => {
  it('ne contient que des URLs https valides et un e-mail bien formé', () => {
    for (const url of [SITE.domain, SITE.githubUrl, SITE.linkedinUrl, SITE.cvUrl]) {
      expect(new URL(url).protocol).toBe('https:');
    }
    expect(SITE.email).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/);
    expect(SITE.githubUrl.endsWith(SITE.githubUser)).toBe(true);
  });
});

describe('source unique des URLs', () => {
  it("n'a aucune URL ni e-mail en dur hors de src/config/site.ts", () => {
    const offenders = walk('src', ['.ts', '.astro'])
      .filter((file) => !ALLOWED.some((pattern) => pattern.test(file)))
      .filter((file) => EXTERNAL.test(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
