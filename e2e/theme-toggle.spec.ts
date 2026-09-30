import { expect, test, type Page } from '@playwright/test';

const LABELS = {
  fr: { toDark: 'Passer en mode sombre', toLight: 'Passer en mode clair' },
  en: { toDark: 'Switch to dark mode', toLight: 'Switch to light mode' },
} as const;
const DARK_BACKGROUND = 'rgb(14, 16, 21)';
const LIGHT_BACKGROUND = 'rgb(252, 252, 253)';

const backgroundOf = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);

for (const lang of ['fr', 'en'] as const) {
  test.describe(`bouton de thème (${lang})`, () => {
    test.use({ colorScheme: 'light' });

    test('bascule, met à jour son libellé et persiste au rechargement', async ({ page }) => {
      const { toDark, toLight } = LABELS[lang];
      await page.goto(`/${lang}/`);
      await page.getByRole('button', { name: toDark }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      expect(await backgroundOf(page)).toBe(DARK_BACKGROUND);

      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await expect(page.getByRole('button', { name: toLight })).toBeVisible();

      await page.getByRole('button', { name: toLight }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
      expect(await backgroundOf(page)).toBe(LIGHT_BACKGROUND);
      expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('light');
    });

    test('est utilisable au clavier', async ({ page }) => {
      await page.goto(`/${lang}/`);
      await page.getByRole('button', { name: LABELS[lang].toDark }).focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    });
  });
}

test('part du thème sombre du système et bascule vers le clair', async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: 'dark' });
  const page = await context.newPage();
  await page.goto('/fr/');
  await page.getByRole('button', { name: LABELS.fr.toLight }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await context.close();
});
