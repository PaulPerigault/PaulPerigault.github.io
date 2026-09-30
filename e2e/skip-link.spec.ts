import { expect, test } from '@playwright/test';

const LABELS = { fr: 'Aller au contenu principal', en: 'Skip to main content' } as const;

for (const lang of ['fr', 'en'] as const) {
  test(`lien d'évitement ${lang} : premier arrêt clavier, visible, déplace le focus`, async ({
    page,
  }) => {
    await page.goto(`/${lang}/`);
    await page.keyboard.press('Tab');
    const link = page.getByRole('link', { name: LABELS[lang] });
    await expect(link).toBeFocused();
    await expect(link).toBeInViewport();

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`/${lang}/#content$`));
    await expect(page.locator('main#content')).toBeFocused();
  });
}
