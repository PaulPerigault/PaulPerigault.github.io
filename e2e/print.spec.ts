import { expect, test } from '@playwright/test';

test.describe('impression (le CV papier est la page)', () => {
  test.use({ colorScheme: 'dark' });

  test('sans navigation ni pied de page, en clair même si le système est sombre, avec les adresses des liens', async ({
    page,
  }) => {
    await page.goto('/fr/');
    await page.emulateMedia({ media: 'print' });
    await expect(page.getByRole('banner')).toBeHidden();
    await expect(page.getByRole('contentinfo')).toBeHidden();
    const background = await page.evaluate(
      () => getComputedStyle(document.documentElement).backgroundColor,
    );
    expect(background).toBe('rgb(252, 252, 253)');
    const link = await page.evaluate(
      () =>
        getComputedStyle(document.querySelector('main a[href^="http"]') as Element, '::after')
          .content,
    );
    // Chromium sérialise `" (https://…)"`, Firefox et WebKit la liste de jetons : on vérifie le fond.
    expect(link).toContain('(');
    expect(link).toContain('https://');
  });
});
