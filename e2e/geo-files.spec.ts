import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { loadContent } from './helpers/content';

const WELCOMED = [
  'Googlebot',
  'Bingbot',
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'PerplexityBot',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'Meta-ExternalAgent',
];
const ORIGIN = 'https://paulperigault.fr';

test.describe('robots et fichiers pour les IA', () => {
  test('robots.txt accueille explicitement les moteurs et les IA, sans aucune interdiction', async ({
    request,
  }) => {
    const robots = await (await request.get('/robots.txt')).text();
    for (const agent of WELCOMED) expect(robots).toContain(`User-agent: ${agent}\n`);
    expect(robots).not.toMatch(/^Disallow:\s*\S/m);
    expect(robots).toContain(`Sitemap: ${ORIGIN}/sitemap-index.xml`);
  });

  test('llms.txt ne contient que des liens internes valides et des liens externes https', async ({
    request,
  }) => {
    const text = await (await request.get('/llms.txt')).text();
    expect(text.startsWith('# Paul Perigault')).toBe(true);
    const urls = [...text.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((match) => match[1] as string);
    const internal = urls.filter((url) => new URL(url).origin === ORIGIN);
    expect(internal.length).toBeGreaterThanOrEqual(5);
    for (const url of internal) {
      expect((await request.get(new URL(url).pathname)).status(), url).toBe(200);
    }
  });

  for (const lang of ['fr', 'en'] as const) {
    test(`le profil Markdown ${lang} reflète exactement les données sources`, async ({
      request,
    }) => {
      const response = await request.get(`/${lang}/index.md`);
      expect(response.headers()['content-type']).toContain('markdown');
      const markdown = await response.text();
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
      for (const text of expected) expect(markdown, text).toContain(text);
    });
  }

  test('llms-full.txt contient les deux profils', async ({ request }) => {
    const text = await (await request.get('/llms-full.txt')).text();
    expect(text).toContain('# Paul Perigault — Ingénieur DevOps');
    expect(text).toContain('# Paul Perigault — DevOps Engineer');
  });

  test('la clé IndexNow est servie, security.txt est valide et non expiré', async ({ request }) => {
    const key = readFileSync('public/indexnow-key.txt', 'utf8');
    expect(await (await request.get('/indexnow-key.txt')).text()).toBe(key);

    // `.well-known` (norme) + copie à la racine : upload-pages-artifact exclut les dossiers cachés.
    for (const path of ['/.well-known/security.txt', '/security.txt']) {
      const security = await (await request.get(path)).text();
      expect(security, path).toContain('Contact: mailto:contact@paulperigault.fr');
    }
    const security = await (await request.get('/security.txt')).text();
    const expires = /^Expires: (.+)$/m.exec(security)?.[1] ?? '';
    expect(new Date(expires).getTime()).toBeGreaterThan(Date.now());
  });

  for (const lang of ['fr', 'en'] as const) {
    test(`la page ${lang} annonce sa version Markdown`, async ({ page, request }) => {
      await page.goto(`/${lang}/`);
      const alternate = page.locator('link[rel="alternate"][type="text/markdown"]');
      await expect(alternate).toHaveAttribute('href', `/${lang}/index.md`);
      expect((await request.get(`/${lang}/index.md`)).status()).toBe(200);
    });
  }
});
