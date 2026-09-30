import { expect, test } from '@playwright/test';

const SECTIONS = [
  'about',
  'experience',
  'formation',
  'skills',
  'projects',
  'certifications',
  'contact',
];
const LABELS = {
  fr: ['À propos', 'Expériences', 'Formation', 'Stack', 'Projets', 'Certifications', 'Contact'],
  en: ['About', 'Experience', 'Education', 'Stack', 'Projects', 'Certifications', 'Contact'],
} as const;
const BACK_TO_TOP = { fr: 'Retour en haut', en: 'Back to top' } as const;
const NAV_NAME = { fr: 'Navigation principale', en: 'Main navigation' } as const;

for (const lang of ['fr', 'en'] as const) {
  test.describe(`navigation bureau (${lang})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/${lang}/`);
    });

    test('affiche les sections dans l’ordre, localisées, vers les bonnes ancres', async ({
      page,
    }) => {
      const links = page.getByRole('navigation', { name: NAV_NAME[lang] }).getByRole('link');
      await expect(links).toHaveText(LABELS[lang]);
      const hrefs = await links.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('href')),
      );
      expect(hrefs).toEqual(SECTIONS.map((id) => `/${lang}/#${id}`));
    });

    test('la marque ramène à l’accueil de la langue', async ({ page }) => {
      await expect(
        page.getByRole('banner').getByRole('link', { name: 'Paul Perigault', exact: true }),
      ).toHaveAttribute('href', `/${lang}/`);
    });

    test('les sections de la page suivent l’ordre de la navigation', async ({ page }) => {
      const ids = await page
        .locator('main section[id]')
        .evaluateAll((nodes) => nodes.map((node) => node.id));
      expect(ids).toEqual(SECTIONS);
    });

    test('le bouton de menu mobile est absent sur grand écran', async ({ page }) => {
      await expect(page.locator('[data-menu-open]')).toBeHidden();
    });

    test('le pied de page signe le site et ramène en haut', async ({ page }) => {
      const footer = page.getByRole('contentinfo');
      await footer.scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      await expect(footer).toContainText(/©\s*\d{4}\s*Paul Perigault/);
      await footer.getByRole('link', { name: BACK_TO_TOP[lang] }).click();
      await expect(page).toHaveURL(/#top$/);
      // Le lien doit réellement remonter : l'en-tête collant ne peut pas servir de cible.
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    });
  });
}
