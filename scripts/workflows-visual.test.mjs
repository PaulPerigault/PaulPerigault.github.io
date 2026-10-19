// Régression visuelle (#201) : le job CI `visual` et `npm run test:visual:update` utilisent la même
// image Playwright, épinglée par digest, dont la version suit @playwright/test (sinon les pixels et
// le navigateur divergent, et toutes les captures cassent à la mise à jour suivante).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VISUAL_IMAGE, VISUAL_PLATFORM } from './lib/visual-image.mjs';

const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
const visualJob = ci.split(/^ {2}visual:\n/m)[1]?.split(/^ {2}\w/m)[0] ?? '';
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const playwrightVersion = lock.packages['node_modules/@playwright/test'].version;

describe('régression visuelle', () => {
  it('tourne dans l’image Playwright épinglée par digest, la même qu’en local', () => {
    expect(VISUAL_IMAGE).toMatch(
      /^mcr\.microsoft\.com\/playwright:v[\d.]+-noble@sha256:[0-9a-f]{64}$/,
    );
    expect(visualJob).toContain(`image: ${VISUAL_IMAGE}`);
    expect(VISUAL_PLATFORM).toBe('linux/amd64');
  });

  it('suit la version de @playwright/test', () => {
    expect(VISUAL_IMAGE).toContain(`:v${playwrightVersion}-`);
  });

  it('teste l’artefact construit et publie les références manquantes à relire', () => {
    expect(visualJob).toMatch(/needs: build\n/);
    expect(visualJob).toContain('name: site');
    expect(visualJob).toContain("VISUAL: '1'");
    expect(visualJob).toContain('name: visual-snapshots');
  });
});
