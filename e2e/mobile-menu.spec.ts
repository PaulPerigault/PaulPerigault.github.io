import { expect, test } from '@playwright/test';

const COPY = {
  fr: { open: 'Ouvrir le menu', close: 'Fermer le menu', contact: 'Contact' },
  en: { open: 'Open menu', close: 'Close menu', contact: 'Contact' },
} as const;
const TAB_PRESSES = 12;

test.use({ viewport: { width: 375, height: 700 } });

for (const lang of ['fr', 'en'] as const) {
  test.describe(`menu mobile (${lang})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/${lang}/`);
    });

    test('remplace la navigation inline par un bouton', async ({ page }) => {
      await expect(page.getByRole('button', { name: COPY[lang].open })).toBeVisible();
      await expect(page.locator('header nav').first()).toBeHidden();
    });

    test('ouvre un dialogue modal, annonce son état et y place le focus', async ({ page }) => {
      const opener = page.getByRole('button', { name: COPY[lang].open });
      await opener.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(opener).toHaveAttribute('aria-expanded', 'true');
      expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true);
    });

    test('piège le focus : jamais sur un élément de la page derrière le dialogue', async ({
      page,
    }) => {
      await page.getByRole('button', { name: COPY[lang].open }).click();
      for (let press = 0; press < TAB_PRESSES; press += 1) {
        await page.keyboard.press('Tab');
        // Le focus reste dans le dialogue ou sort vers l'interface du navigateur (body), jamais dans la page inerte.
        const escaped = await page.evaluate(() => {
          const active = document.activeElement;
          return active !== document.body && !active?.closest('dialog');
        });
        expect(escaped).toBe(false);
      }
    });

    test('Escape ferme le menu et rend le focus au bouton', async ({ page }) => {
      const opener = page.getByRole('button', { name: COPY[lang].open });
      await opener.click();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toBeHidden();
      await expect(opener).toBeFocused();
      await expect(opener).toHaveAttribute('aria-expanded', 'false');
    });

    test('le bouton de fermeture ferme le menu', async ({ page }) => {
      await page.getByRole('button', { name: COPY[lang].open }).click();
      await page.getByRole('button', { name: COPY[lang].close }).click();
      await expect(page.getByRole('dialog')).toBeHidden();
    });

    test('choisir une section ferme le menu et navigue vers l’ancre', async ({ page }) => {
      await page.getByRole('button', { name: COPY[lang].open }).click();
      await page.getByRole('dialog').getByRole('link', { name: COPY[lang].contact }).click();
      await expect(page.getByRole('dialog')).toBeHidden();
      await expect(page).toHaveURL(/#contact$/);
    });
  });
}
