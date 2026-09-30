import { expect, test } from '@playwright/test';

const SECTIONS = [
  'about',
  'skills',
  'experience',
  'formation',
  'projects',
  'certifications',
  'contact',
];
const LABELS = {
  fr: ['À propos', 'Stack', 'Expériences', 'Formation', 'Projets', 'Certifications', 'Contact'],
  en: ['About', 'Stack', 'Experience', 'Education', 'Projects', 'Certifications', 'Contact'],
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
      await expect(page.getByRole('link', { name: 'paul@perigault' })).toHaveAttribute(
        'href',
        `/${lang}/`,
      );
    });

    test('le bouton de menu mobile est absent sur grand écran', async ({ page }) => {
      await expect(page.locator('[data-menu-open]')).toBeHidden();
    });

    test('le pied de page signe le site et ramène en haut', async ({ page }) => {
      const footer = page.getByRole('contentinfo');
      await expect(footer).toContainText(/©\s*\d{4}\s*Paul Perigault/);
      await footer.getByRole('link', { name: BACK_TO_TOP[lang] }).click();
      await expect(page).toHaveURL(/#top$/);
    });
  });
}
