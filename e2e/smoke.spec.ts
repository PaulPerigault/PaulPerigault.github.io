import { expect, test } from '@playwright/test';

const PAGES = [
  { path: '/fr/', lang: 'fr', title: /Ingénieur DevOps/ },
  { path: '/en/', lang: 'en', title: /DevOps Engineer/ },
] as const;

for (const { path, lang, title } of PAGES) {
  test.describe(`socle ${lang}`, () => {
    test('répond avec le bon titre, la bonne langue et un seul h1', async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(title);
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Paul Perigault');
    });
  });
}

test('la racine redirige vers /fr/', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/fr\/$/);
});
