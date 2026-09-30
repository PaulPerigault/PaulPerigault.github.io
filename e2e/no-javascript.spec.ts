import { expect, test } from '@playwright/test';

test.use({ javaScriptEnabled: false, viewport: { width: 375, height: 700 } });

for (const lang of ['fr', 'en'] as const) {
  test.describe(`sans JavaScript (${lang})`, () => {
    test('la navigation par ancres reste visible, sans menu ni bouton de thème inutiles', async ({
      page,
    }) => {
      await page.goto(`/${lang}/`);
      await expect(page.locator('header nav').first().getByRole('link')).toHaveCount(7);
      await expect(page.locator('header nav a').first()).toBeVisible();
      await expect(page.locator('[data-menu-open]')).toBeHidden();
      await expect(page.locator('[data-theme-toggle]')).toBeHidden();
    });

    test('le changement de langue fonctionne', async ({ page }) => {
      await page.goto(`/${lang}/`);
      await page.locator('[data-lang-switch]').click();
      await expect(page).toHaveURL(new RegExp(`/${lang === 'fr' ? 'en' : 'fr'}/$`));
    });
  });
}

test('la racine redirige vers /fr/ via la balise meta refresh', async ({ page }) => {
  await page.goto('/');
  await page.waitForURL(/\/fr\/$/);
});
