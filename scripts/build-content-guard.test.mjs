import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const BUILD_TIMEOUT_MS = 120_000;

/** Lance `astro build` sur une copie du contenu modifiée par `mutate`. */
function buildWith(mutate) {
  const dir = mkdtempSync(join(tmpdir(), 'content-'));
  cpSync('src/content', dir, { recursive: true });
  mutate(dir);
  return spawnSync('npx', ['astro', 'build', '--outDir', join(dir, 'out')], {
    env: { ...process.env, CONTENT_DIR: dir },
    encoding: 'utf8',
  });
}

describe('le build protège la qualité du contenu', () => {
  it(
    'réussit avec le contenu du dépôt',
    () => {
      expect(buildWith(() => {}).status).toBe(0);
    },
    BUILD_TIMEOUT_MS,
  );

  it(
    'échoue quand un champ EN est invalide, en nommant fichier et champ',
    () => {
      const result = buildWith((dir) => {
        const file = join(dir, 'en', 'experience.json');
        const data = JSON.parse(readFileSync(file, 'utf8'));
        data[0].dateStart = '09/2023';
        writeFileSync(file, JSON.stringify(data));
      });
      expect(result.status).not.toBe(0);
      expect(`${result.stdout}${result.stderr}`).toMatch(/en\/experience\.json[\s\S]*dateStart/);
    },
    BUILD_TIMEOUT_MS,
  );

  it(
    'échoue quand un fichier de la version EN manque',
    () => {
      const result = buildWith((dir) => writeFileSync(join(dir, 'en', 'skills.json'), 'oops'));
      expect(result.status).not.toBe(0);
      expect(`${result.stdout}${result.stderr}`).toContain('en/skills.json');
    },
    BUILD_TIMEOUT_MS,
  );
});
