import { expect, test } from '@playwright/test';

const EXPECTED = {
  fr: { role: 'Ingénieur DevOps', description: /alternance à l'ESIEA Paris chez WeVii/ },
  en: { role: 'DevOps Engineer', description: /apprentice at ESIEA Paris, working at WeVii/ },
} as const;

for (const [lang, expected] of Object.entries(EXPECTED)) {
  test.describe(`contenu ${lang}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/${lang}/`);
    });

    test('titre, description et rôle sont dans la langue de la page', async ({ page }) => {
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        expected.description,
      );
      await expect(page.getByText(expected.role, { exact: true })).toBeVisible();
    });

    test("n'affiche aucun texte de l'autre langue", async ({ page }) => {
      const other = lang === 'fr' ? EXPECTED.en.role : EXPECTED.fr.role;
      await expect(page.getByText(other, { exact: true })).toHaveCount(0);
    });
  });
}
