import { expect, test, type Locator } from '@playwright/test';
import { loadContent } from './helpers/content';

const COPY = {
  fr: { title: 'Projets', updated: 'Mis à jour', fetched: 'Données GitHub' },
  en: { title: 'Projects', updated: 'Updated', fetched: 'GitHub data' },
} as const;
const MAX_TOPICS = 4;
const GITHUB_API_HOST = 'api.github.com';

/** Le build local sans accès à GitHub se replie sur un état vide ; en CI il est strict : données exigées. */
const requireData = async (region: Locator) => {
  const state = await region.locator('[data-state]').getAttribute('data-state');
  if (process.env['CI']) expect(state).toBe('ready');
  test.skip(state === 'empty', 'GitHub inaccessible lors du build local : section vide');
};

for (const lang of ['fr', 'en'] as const) {
  test.describe(`projets (${lang})`, () => {
    test('la section est un repère nommé par son titre', async ({ page }) => {
      await page.goto(`/${lang}/`);
      await expect(page.getByRole('region', { name: COPY[lang].title })).toBeVisible();
    });

    test('affiche un projet par dépôt configuré, avec liens sûrs et thèmes limités', async ({
      page,
    }) => {
      await page.goto(`/${lang}/`);
      const region = page.getByRole('region', { name: COPY[lang].title });
      await requireData(region);
      const { featured } = loadContent<{ featured: string[] }>(lang, 'projects-config');
      const cards = region.locator('li', { has: page.locator('h3') });
      await expect(cards).toHaveCount(featured.length);
      for (const card of await cards.all()) {
        const link = card.locator('h3 a');
        await expect(link).toHaveAttribute('href', /^https:\/\/github\.com\/PaulPerigault\//);
        await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        expect(await card.locator('ul li').count()).toBeLessThanOrEqual(MAX_TOPICS);
        await expect(card).toContainText(COPY[lang].updated);
      }
      await expect(region).toContainText(COPY[lang].fetched);
    });

    test('ne contacte jamais l’API GitHub depuis le navigateur', async ({ page }) => {
      const calls: string[] = [];
      page.on('request', (request) => {
        if (new URL(request.url()).hostname === GITHUB_API_HOST) calls.push(request.url());
      });
      await page.goto(`/${lang}/`);
      await page.waitForLoadState('networkidle');
      expect(calls).toEqual([]);
    });
  });
}
