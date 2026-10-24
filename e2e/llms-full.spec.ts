import { readFileSync } from 'node:fs';
import { expect, test, type APIRequestContext } from '@playwright/test';
import { llmsConsistencyProblems } from '../scripts/lib/llms-consistency.mjs';
import { loadContent, type TestLang } from './helpers/content';
import { ORIGIN, sitemapUrls } from './helpers/sitemap';

const LANGS: TestLang[] = ['fr', 'en'];
const text = async (request: APIRequestContext, path: string) => (await request.get(path)).text();

test.describe('llms-full.txt : généré au build depuis le contenu réel', () => {
  test('est servi en text/plain UTF-8, y compris les accents', async ({ request }) => {
    const response = await request.get('/llms-full.txt');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('text/plain; charset=utf-8');
    expect(await response.text()).toContain('Perigault — Alternant');
  });

  test('est identique au fichier de dist/ (aucune copie écrite à la main)', async ({ request }) => {
    expect(await text(request, '/llms-full.txt')).toBe(readFileSync('dist/llms-full.txt', 'utf8'));
  });

  for (const lang of LANGS) {
    test(`reprend tout le contenu source ${lang} (expérience, formation, compétences, certifications)`, async ({
      request,
    }) => {
      const full = await text(request, '/llms-full.txt');
      const experience = loadContent<{ company: string; role: string }[]>(lang, 'experience');
      const formation = loadContent<{ school: string; degree: string }[]>(lang, 'formation');
      const skills = loadContent<{ category: string; items: string[] }[]>(lang, 'skills');
      const certifications = loadContent<{ name: string }[]>(lang, 'certifications');
      const expected = [
        ...experience.flatMap((item) => [item.company, item.role]),
        ...formation.flatMap((item) => [item.school, item.degree]),
        ...skills.flatMap((item) => [item.category, ...item.items]),
        ...certifications.map((item) => item.name),
      ];
      for (const value of expected) expect(full, `${lang} : ${value}`).toContain(value);
    });
  }

  test('est cohérent avec llms.txt, les profils Markdown et le sitemap', async ({ request }) => {
    const problems = llmsConsistencyProblems({
      origin: ORIGIN,
      llms: await text(request, '/llms.txt'),
      llmsFull: await text(request, '/llms-full.txt'),
      profiles: await Promise.all(LANGS.map((lang) => text(request, `/${lang}/index.md`))),
      sitemapUrls: await sitemapUrls(request),
    });
    expect(problems).toEqual([]);
  });

  test('le détecteur échoue sur un fichier périmé (canari)', async ({ request }) => {
    const stale = (await text(request, '/llms-full.txt')).replace('Perigault', 'Périmé');
    const problems = llmsConsistencyProblems({
      origin: ORIGIN,
      llms: await text(request, '/llms.txt'),
      llmsFull: stale,
      profiles: await Promise.all(LANGS.map((lang) => text(request, `/${lang}/index.md`))),
      sitemapUrls: await sitemapUrls(request),
    });
    expect(problems.length).toBeGreaterThan(0);
  });
});
