import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildSite } from './lib/astro-build.mjs';

const BUILD_TIMEOUT_MS = 120_000;

/** Construit le site sur une copie du contenu modifiée par `mutate`. */
async function buildWith(mutate) {
  const dir = mkdtempSync(join(tmpdir(), 'content-'));
  cpSync('src/content', dir, { recursive: true });
  mutate(dir);
  return buildSite({ env: { CONTENT_DIR: dir } });
}

describe('le build protège la qualité du contenu', () => {
  it(
    'réussit avec le contenu du dépôt',
    async () => {
      expect((await buildWith(() => {})).status).toBe(0);
    },
    BUILD_TIMEOUT_MS,
  );

  it(
    'échoue quand un champ EN est invalide, en nommant fichier et champ',
    async () => {
      const result = await buildWith((dir) => {
        const file = join(dir, 'en', 'experience.json');
        const data = JSON.parse(readFileSync(file, 'utf8'));
        data[0].dateStart = '09/2023';
        writeFileSync(file, JSON.stringify(data));
      });
      expect(result.status).not.toBe(0);
      expect(result.output).toMatch(/en\/experience\.json[\s\S]*dateStart/);
    },
    BUILD_TIMEOUT_MS,
  );

  it(
    'échoue quand un fichier de la version EN est illisible',
    async () => {
      const result = await buildWith((dir) =>
        writeFileSync(join(dir, 'en', 'skills.json'), 'oops'),
      );
      expect(result.status).not.toBe(0);
      expect(result.output).toContain('en/skills.json');
    },
    BUILD_TIMEOUT_MS,
  );
});
