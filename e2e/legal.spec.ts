import { expect, test } from '@playwright/test';
import { loadContent } from './helpers/content';

interface Legal {
  title: string;
  sections: { id: string; title: string; paragraphs: string[] }[];
}

const FOOTER_LINK = {
  fr: 'Mentions légales et confidentialité',
  en: 'Legal notice and privacy',
} as const;

for (const lang of ['fr', 'en'] as const) {
  test.describe(`mentions légales (${lang})`, () => {
    test('le pied de page y mène', async ({ page }) => {
      await page.goto(`/${lang}/`);
      await page.getByRole('contentinfo').getByRole('link', { name: FOOTER_LINK[lang] }).click();
      await expect(page).toHaveURL(new RegExp(`/${lang}/legal/$`));
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(FOOTER_LINK[lang]);
    });

    test('affiche toutes les sections du contenu source, avec e-mail et domaine renseignés', async ({
      page,
    }) => {
      await page.goto(`/${lang}/legal/`);
      const { sections } = loadContent<Legal>(lang, 'legal');
      await expect(page.getByRole('heading', { level: 2 })).toHaveCount(sections.length);
      for (const section of sections) {
        await expect(page.getByRole('region', { name: section.title })).toBeVisible();
      }
      const text = await page.locator('main').innerText();
      expect(text).toContain('contact@paulperigault.fr');
      expect(text).toContain('https://paulperigault.fr');
      expect(text).not.toMatch(/\{(email|domain)\}/);
    });

    test('nomme l’hébergeur, le stockage local et les droits', async ({ page }) => {
      await page.goto(`/${lang}/legal/`);
      const text = await page.locator('main').innerText();
      for (const fact of ['GitHub', 'paulperigault.dev', 'theme', 'lang', 'CNIL']) {
        expect(text, fact).toContain(fact);
      }
    });

    test('est indexable, localisée et reliée à sa version dans l’autre langue', async ({
      page,
    }) => {
      await page.goto(`/${lang}/legal/`);
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
      const other = lang === 'fr' ? 'en' : 'fr';
      await expect(page.locator(`link[rel="alternate"][hreflang="${other}"]`)).toHaveAttribute(
        'href',
        `https://paulperigault.fr/${other}/legal/`,
      );
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `https://paulperigault.fr/${lang}/legal/`,
      );
    });
  });
}

test('les deux pages sont dans le sitemap', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap-0.xml')).text();
  for (const lang of ['fr', 'en']) {
    expect(sitemap).toContain(`<loc>https://paulperigault.fr/${lang}/legal/</loc>`);
  }
});
