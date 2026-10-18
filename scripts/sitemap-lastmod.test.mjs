import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { lastmodFor, routeSources } from './lib/sitemap-lastmod.mjs';

const git = (cwd, date, ...args) =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], {
    cwd,
    env: { ...process.env, GIT_COMMITTER_DATE: date, GIT_AUTHOR_DATE: date },
    stdio: 'ignore',
  });

const commit = (cwd, file, date) => {
  mkdirSync(join(cwd, file, '..'), { recursive: true });
  writeFileSync(join(cwd, file), date);
  git(cwd, date, 'add', '.');
  git(cwd, date, 'commit', '-m', file);
};

// Un commit par mois, chacun sur une source différente : la date dit quel fichier a compté.
const HISTORY = [
  ['src/content/fr/experience.json', '2026-01-01T00:00:00Z'],
  ['src/content/en/experience.json', '2026-02-01T00:00:00Z'],
  ['src/content/fr/legal.json', '2026-03-01T00:00:00Z'],
  ['src/pages/[lang]/legal.astro', '2026-04-01T00:00:00Z'],
  ['src/pages/l/index.astro', '2026-05-01T00:00:00Z'],
  ['src/styles/base.css', '2026-06-01T00:00:00Z'],
  ['src/lib/chronology.test.ts', '2026-07-01T00:00:00Z'],
];

let repo = '';
beforeAll(() => {
  repo = mkdtempSync(join(tmpdir(), 'sitemap-lastmod-'));
  git(repo, '2025-12-01T00:00:00Z', 'init', '-q');
  for (const [file, date] of HISTORY) commit(repo, file, date);
});

describe('lastmodFor', () => {
  it('date chaque langue de l’accueil par son propre contenu', () => {
    expect(lastmodFor('/fr/', repo)).toBe('2026-01-01T00:00:00.000Z');
    expect(lastmodFor('/en/', repo)).toBe('2026-02-01T00:00:00.000Z');
  });

  it('date la page légale par son texte et son gabarit, pas par l’accueil', () => {
    expect(lastmodFor('/fr/legal/', repo)).toBe('2026-04-01T00:00:00.000Z');
  });

  it('date la page légale des deux langues par leur gabarit commun', () => {
    expect(lastmodFor('/en/legal/', repo)).toBe('2026-04-01T00:00:00.000Z');
  });

  it('lit [lang] littéralement : src/pages/l/index.astro ne date pas l’accueil', () => {
    // Sans :(literal), « [lang] » serait aussi un motif qui accepte le dossier « l » (mai 2026).
    for (const path of ['/fr/', '/en/']) expect(lastmodFor(path, repo)).not.toMatch(/^2026-05/);
  });

  it('ignore les styles et les tests, qui ne changent pas le contenu', () => {
    for (const path of ['/fr/', '/en/', '/fr/legal/']) {
      expect(lastmodFor(path, repo)).not.toMatch(/^2026-0[67]/);
    }
  });

  it('ne donne aucune date hors d’un dépôt Git plutôt qu’une date inventée', () => {
    expect(lastmodFor('/fr/', tmpdir())).toBeUndefined();
  });
});

describe('routeSources', () => {
  it('refuse une route sans sources déclarées, pour qu’aucune page n’ait une date fausse', () => {
    expect(() => routeSources('/fr/blog/')).toThrow(/sitemap-lastmod/);
  });
});
