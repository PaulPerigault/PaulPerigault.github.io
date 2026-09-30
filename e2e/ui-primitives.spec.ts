import { expect, test } from '@playwright/test';

const NEW_TAB = { fr: "s'ouvre dans un nouvel onglet", en: 'opens in a new tab' } as const;

for (const lang of ['fr', 'en'] as const) {
  test.describe(`primitives UI (${lang})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/${lang}/styleguide/`);
    });

    test('la page technique est exclue des moteurs', async ({ page }) => {
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    });

    test('les niveaux de titre sont sémantiques et sans saut', async ({ page }) => {
      const levels = await page
        .locator('h1, h2, h3, h4')
        .evaluateAll((nodes) => nodes.map((node) => Number(node.tagName.slice(1))));
      expect(levels[0]).toBe(1);
      levels.slice(1).forEach((level, index) => {
        expect(level - (levels[index] as number)).toBeLessThanOrEqual(1);
      });
    });

    test('chaque section est un repère nommé par son titre', async ({ page }) => {
      for (const name of ['Typographie', 'Liens et boutons', 'Chronologie']) {
        await expect(page.getByRole('region', { name })).toBeVisible();
      }
    });

    test('les liens externes sont sûrs et annoncent le nouvel onglet', async ({ page }) => {
      const external = page.locator('main a[href^="http"]');
      expect(await external.count()).toBeGreaterThan(0);
      for (const link of await external.all()) {
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        await expect(link).toContainText(NEW_TAB[lang]);
      }
    });

    test('mailto et liens internes ne changent pas d’onglet', async ({ page }) => {
      for (const selector of ['a[href^="mailto:"]', 'main a[href="/fr/"]']) {
        await expect(page.locator(selector).first()).not.toHaveAttribute('target', /.+/);
      }
    });

    test('la navigation clavier parcourt tous les éléments interactifs avec un focus visible', async ({
      page,
    }) => {
      const links = await page.locator('a:visible, button:visible').count();
      for (let index = 0; index < links; index += 1) {
        await page.keyboard.press('Tab');
        const outline = await page.evaluate(() => {
          const style = getComputedStyle(document.activeElement as Element);
          return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
        });
        expect(outline.style).not.toBe('none');
        expect(outline.width).toBeGreaterThan(0);
      }
    });

    test('la chronologie est une liste ordonnée avec des dates machine', async ({ page }) => {
      await expect(page.locator('ol > li time[datetime]')).toHaveCount(2);
    });

    test('toutes les icônes sont décoratives', async ({ page }) => {
      const svgs = page.locator('main svg');
      const total = await svgs.count();
      expect(total).toBeGreaterThan(0);
      await expect(page.locator('main svg[aria-hidden="true"]')).toHaveCount(total);
    });
  });
}
