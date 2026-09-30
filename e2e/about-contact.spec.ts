import { expect, test } from '@playwright/test';

const COPY = {
  fr: { about: 'À propos', place: 'Lieu', contact: 'Contact', email: 'E-mail' },
  en: { about: 'About', place: 'Location', contact: 'Contact', email: 'Email' },
} as const;

for (const lang of ['fr', 'en'] as const) {
  test.describe(`à propos et contact (${lang})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/${lang}/`);
    });

    test('À propos : repère nommé, faits clés et lieu', async ({ page }) => {
      const about = page.getByRole('region', { name: COPY[lang].about });
      await expect(about).toBeVisible();
      await expect(about).toContainText('ESIEA Paris');
      await expect(about).toContainText('WeVii');
      await expect(about).toContainText(lang === 'fr' ? 'septembre 2023' : 'September 2023');
      await expect(about.getByText(COPY[lang].place)).toBeVisible();
      await expect(about).toContainText('Paris, France');
    });

    test('Contact : e-mail, LinkedIn et GitHub avec annonce du nouvel onglet', async ({ page }) => {
      const contact = page.getByRole('region', { name: COPY[lang].contact });
      await expect(contact.getByRole('link', { name: 'contact@paulperigault.fr' })).toHaveAttribute(
        'href',
        'mailto:contact@paulperigault.fr',
      );
      for (const name of ['paul-perigault', 'PaulPerigault']) {
        const link = contact.getByRole('link', { name: new RegExp(name) });
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      }
      await expect(contact.getByText(COPY[lang].email)).toBeVisible();
    });
  });
}
