import { expect, test } from '@playwright/test';

const COPY = {
  fr: {
    role: 'Alternant DevOps Cloud',
    school: 'Cycle ingénieur ESIEA Paris · WeVii',
    cv: /Télécharger le CV/,
    contact: /Me contacter/,
  },
  en: {
    role: 'Cloud DevOps Apprentice',
    school: 'Engineering cycle at ESIEA Paris · WeVii',
    cv: /Download CV/,
    contact: /Get in touch/,
  },
} as const;

for (const lang of ['fr', 'en'] as const) {
  test.describe(`hero (${lang})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/${lang}/`);
    });

    test('a un seul h1 : le nom, avec rôle et école dans la langue', async ({ page }) => {
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Paul Perigault');
      await expect(page.getByText(COPY[lang].role, { exact: true })).toBeVisible();
      await expect(page.getByText(COPY[lang].school)).toBeVisible();
    });

    test('les liens d’action pointent vers les bonnes cibles, de façon sûre', async ({ page }) => {
      const cv = page.getByRole('link', { name: COPY[lang].cv });
      await expect(cv).toHaveAttribute('href', '/cv-paul-perigault.pdf');
      await expect(cv).toHaveAttribute('download', 'cv-paul-perigault.pdf');

      const contact = page.getByRole('link', { name: COPY[lang].contact });
      await expect(contact).toHaveAttribute('href', 'mailto:contact@paulperigault.fr');
      await expect(contact).not.toHaveAttribute('target', /.+/);

      await expect(page.getByRole('link', { name: /^GitHub/ }).first()).toHaveAttribute(
        'href',
        'https://github.com/PaulPerigault',
      );
      await expect(page.getByRole('link', { name: /^LinkedIn/ }).first()).toHaveAttribute(
        'href',
        'https://www.linkedin.com/in/paul-perigault',
      );
    });

    test('la photo est optimisée (webp), dimensionnée et chargée en priorité', async ({ page }) => {
      const photo = page.getByRole('img', { name: 'Paul Perigault' });
      await expect(photo).toHaveAttribute('src', /\.webp$/);
      await expect(photo).toHaveAttribute('width', '200');
      await expect(photo).toHaveAttribute('height', '200');
      await expect(photo).toHaveAttribute('fetchpriority', 'high');
      await expect(photo).toHaveAttribute('loading', 'eager');
      expect(await photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    });

    test('les actions se parcourent au clavier dans l’ordre', async ({ page }) => {
      await page.getByRole('link', { name: COPY[lang].cv }).focus();
      const order: string[] = [];
      for (let step = 0; step < 3; step += 1) {
        await page.keyboard.press('Tab');
        order.push(await page.evaluate(() => (document.activeElement as HTMLAnchorElement).href));
      }
      expect(order[0]).toMatch(/^mailto:/);
      expect(order[1]).toContain('github.com');
      expect(order[2]).toContain('linkedin.com');
    });
  });
}
