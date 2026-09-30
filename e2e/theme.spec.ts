import { expect, test, type Page } from '@playwright/test';

// Valeurs de tokens.css, vues par le navigateur (rgb) : elles doivent changer avec le thème.
const BACKGROUND = { light: 'rgb(252, 252, 253)', dark: 'rgb(14, 16, 21)' } as const;

const backgroundOf = (page: Page) =>
  page
    .locator('body')
    .evaluate((body) => getComputedStyle(body.parentElement as Element).backgroundColor);

for (const lang of ['fr', 'en'] as const) {
  test.describe(`thème ${lang}`, () => {
    for (const scheme of ['light', 'dark'] as const) {
      test(`suit la préférence système ${scheme} sans JavaScript`, async ({ browser }) => {
        const context = await browser.newContext({ colorScheme: scheme, javaScriptEnabled: false });
        const page = await context.newPage();
        await page.goto(`/${lang}/`);
        expect(await backgroundOf(page)).toBe(BACKGROUND[scheme]);
        await context.close();
      });
    }

    test('le thème choisi prime sur le système et persiste au rechargement', async ({
      browser,
    }) => {
      const context = await browser.newContext({ colorScheme: 'dark' });
      const page = await context.newPage();
      await page.goto(`/${lang}/`);
      await page.evaluate(() => localStorage.setItem('theme', 'light'));
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
      expect(await backgroundOf(page)).toBe(BACKGROUND.light);
      await context.close();
    });

    test('ignore une valeur stockée invalide', async ({ page }) => {
      await page.goto(`/${lang}/`);
      await page.evaluate(() => localStorage.setItem('theme', 'sepia'));
      await page.reload();
      await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
    });
  });
}

test('le script de thème précède les feuilles de style (pas de flash)', async ({ page }) => {
  await page.goto('/fr/', { waitUntil: 'commit' });
  const head = await page.content();
  const script = head.indexOf("localStorage.getItem('theme')");
  const style = head.search(/<link[^>]+stylesheet|<style/);
  expect(script).toBeGreaterThan(-1);
  expect(script).toBeLessThan(style);
});

test('respecte prefers-reduced-motion (pas de défilement animé)', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/fr/');
  const behavior = await page.evaluate(
    () => getComputedStyle(document.documentElement).scrollBehavior,
  );
  expect(behavior).toBe('auto');
  await context.close();
});
