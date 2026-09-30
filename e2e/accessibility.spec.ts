import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 375, height: 700 },
} as const;
const PAGES = ['/fr/', '/en/', '/fr/styleguide/', '/en/styleguide/', '/introuvable/'] as const;

/**
 * Rapport lisible : règle, impact, éléments fautifs. On attend d'abord la fin des transitions de
 * couleur (basculement de thème) : axe lirait sinon une couleur intermédiaire, ce qui rend le
 * contraste aléatoire (constaté dans Firefox).
 */
const audit = async (page: Page) => {
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return violations.map(
    (violation) =>
      `${violation.id} (${violation.impact}) : ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`,
  );
};

for (const scheme of ['light', 'dark'] as const) {
  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(`accessibilité WCAG 2.2 AA (${scheme}, ${device})`, () => {
      test.use({ colorScheme: scheme, viewport });

      for (const path of PAGES) {
        test(`${path} n’a aucune violation`, async ({ page }) => {
          await page.goto(path);
          await page.waitForLoadState('networkidle');
          expect(await audit(page)).toEqual([]);
        });
      }
    });
  }
}

test.describe('accessibilité des états interactifs', () => {
  test('canari : l’audit détecte une vraie violation (image sans alternative)', async ({
    page,
  }) => {
    await page.setContent(
      '<!doctype html><html lang="fr"><title>t</title><body><img src="data:,"></body>',
    );
    expect((await audit(page)).join('\n')).toContain('image-alt');
  });

  test('menu mobile ouvert (dialogue modal)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/fr/');
    await page.locator('[data-menu-open]').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await audit(page)).toEqual([]);
  });

  test('thème forcé à l’opposé du système, après bascule', async ({ page }) => {
    await page.goto('/en/');
    await page.locator('[data-theme-toggle]').click();
    expect(await audit(page)).toEqual([]);
  });

  test('cible d’une ancre : section atteinte', async ({ page }) => {
    await page.goto('/fr/#certifications');
    expect(await audit(page)).toEqual([]);
  });
});
