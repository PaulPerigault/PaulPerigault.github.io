import { expect, test } from '@playwright/test';

const SWITCH = {
  fr: { name: 'English', target: 'en' },
  en: { name: 'Français', target: 'fr' },
} as const;
const NAV_NAME = { fr: 'Navigation principale', en: 'Main navigation' } as const;

for (const lang of ['fr', 'en'] as const) {
  const { name, target } = SWITCH[lang];

  test.describe(`changement de langue depuis ${lang}`, () => {
    test('mène à la page équivalente, localisée', async ({ page }) => {
      await page.goto(`/${lang}/`);
      const link = page.getByRole('link', { name, exact: true });
      await expect(link).toHaveAttribute('hreflang', target);
      await link.click();
      await expect(page).toHaveURL(new RegExp(`/${target}/$`));
      await expect(page.locator('html')).toHaveAttribute('lang', target);
      await expect(page.getByRole('navigation', { name: NAV_NAME[target] })).toBeVisible();
    });

    test('conserve l’ancre courante', async ({ page }) => {
      await page.goto(`/${lang}/#skills`);
      await page.getByRole('link', { name, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/${target}/#skills$`));
    });

    test('mémorise le choix pour la racine du site', async ({ browser }) => {
      const context = await browser.newContext({ locale: lang === 'fr' ? 'fr-FR' : 'en-US' });
      const page = await context.newPage();
      await page.goto(`/${lang}/`);
      await page.getByRole('link', { name, exact: true }).click();
      await page.goto('/');
      await expect(page).toHaveURL(new RegExp(`/${target}/$`));
      await context.close();
    });
  });
}

test('garde la page technique en changeant de langue', async ({ page }) => {
  await page.goto('/fr/styleguide/');
  await page.getByRole('link', { name: 'English', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/styleguide\/$/);
});

test.describe('racine du site', () => {
  for (const [locale, expected] of [
    ['en-US', 'en'],
    ['fr-FR', 'fr'],
    ['de-DE', 'fr'],
  ] as const) {
    test(`redirige ${locale} vers /${expected}/`, async ({ browser }) => {
      const context = await browser.newContext({ locale });
      const page = await context.newPage();
      await page.goto('/');
      await expect(page).toHaveURL(new RegExp(`/${expected}/$`));
      await context.close();
    });
  }
});
