import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildSite } from './lib/astro-build.mjs';
import { walk } from './lib/walk.mjs';

const BUILD_TIMEOUT_MS = 120_000;
const REPO = {
  id: 7,
  name: 'GetUrlCloudRun',
  description: 'Outil de démonstration Cloud Run',
  html_url: 'https://github.com/PaulPerigault/GetUrlCloudRun',
  homepage: 'https://demo.example.org',
  topics: ['t-un', 't-deux', 't-trois', 't-quatre', 't-cinq', 't-six'],
  language: 'Go',
  stargazers_count: 2,
  updated_at: '2026-09-01T00:00:00Z',
};

let server;
let baseUrl;
let status = 200;

beforeEach(async () => {
  status = 200;
  server = createServer((request, response) => {
    const found = status === 200 && request.url === '/repos/PaulPerigault/GetUrlCloudRun';
    response.writeHead(found ? 200 : 404, { 'content-type': 'application/json' });
    response.end(JSON.stringify(found ? REPO : { message: 'Not Found' }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(() => new Promise((resolve) => server.close(resolve)));

const html = (outDir, lang) => readFileSync(join(outDir, lang, 'index.html'), 'utf8');

describe('projets GitHub récupérés au build', () => {
  it(
    'rend les projets dans les deux langues, sans appel navigateur vers GitHub',
    async () => {
      const { status: code, outDir } = await buildSite({ env: { GITHUB_API_URL: baseUrl } });
      expect(code).toBe(0);
      for (const lang of ['fr', 'en']) {
        const page = html(outDir, lang);
        expect(page).toContain('data-state="ready"');
        expect(page).toContain('GetUrlCloudRun');
        expect(page).toContain('Outil de démonstration Cloud Run');
        expect(page).toContain('https://demo.example.org');
        // Seuls les 4 premiers thèmes sont affichés.
        for (const topic of ['t-un', 't-deux', 't-trois', 't-quatre'])
          expect(page).toContain(topic);
        for (const topic of ['t-cinq', 't-six']) expect(page).not.toContain(topic);
      }
      const shipped = walk(outDir, ['.html', '.js', '.json']);
      const leaks = shipped.filter((file) => readFileSync(file, 'utf8').includes('api.github.com'));
      expect(leaks).toEqual([]);
    },
    BUILD_TIMEOUT_MS,
  );

  it(
    'échoue en mode strict quand un dépôt configuré est introuvable',
    async () => {
      status = 404;
      const result = await buildSite({ env: { GITHUB_API_URL: baseUrl, STRICT_DATA: 'true' } });
      expect(result.status).not.toBe(0);
      expect(result.output).toContain('GetUrlCloudRun');
      expect(result.output).toContain('GitHub indisponible');
    },
    BUILD_TIMEOUT_MS,
  );

  it(
    'se replie sur un état vide, avec avertissement, en mode tolérant',
    async () => {
      status = 404;
      const result = await buildSite({ env: { GITHUB_API_URL: baseUrl } });
      expect(result.status).toBe(0);
      expect(result.output).toContain('GitHub indisponible');
      expect(html(result.outDir, 'fr')).toContain('data-state="empty"');
      expect(html(result.outDir, 'en')).toContain('No project to show right now.');
    },
    BUILD_TIMEOUT_MS,
  );
});
