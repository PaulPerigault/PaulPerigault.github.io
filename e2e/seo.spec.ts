import { expect, test, type Page } from '@playwright/test';

const DOMAIN = 'https://paulperigault.fr';
const OTHER = { fr: 'en', en: 'fr' } as const;
const LOCALE = { fr: 'fr_FR', en: 'en_US' } as const;
const meta = (page: Page, attribute: 'name' | 'property', key: string) =>
  page.locator(`meta[${attribute}="${key}"]`);

for (const lang of ['fr', 'en'] as const) {
  test.describe(`SEO (${lang})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/${lang}/`);
    });

    test('a un canonical fixe, des hreflang réciproques et x-default', async ({ page }) => {
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `${DOMAIN}/${lang}/`,
      );
      for (const [hreflang, code] of [
        ['fr', 'fr'],
        ['en', 'en'],
        ['x-default', 'fr'],
      ] as const) {
        await expect(page.locator(`link[rel="alternate"][hreflang="${hreflang}"]`)).toHaveAttribute(
          'href',
          `${DOMAIN}/${code}/`,
        );
      }
    });

    test('expose Open Graph et Twitter Card cohérents avec le titre', async ({ page }) => {
      const title = await page.title();
      await expect(meta(page, 'property', 'og:title')).toHaveAttribute('content', title);
      await expect(meta(page, 'property', 'og:locale')).toHaveAttribute('content', LOCALE[lang]);
      await expect(meta(page, 'property', 'og:locale:alternate')).toHaveAttribute(
        'content',
        LOCALE[OTHER[lang]],
      );
      await expect(meta(page, 'property', 'og:url')).toHaveAttribute(
        'content',
        `${DOMAIN}/${lang}/`,
      );
      await expect(meta(page, 'property', 'og:image')).toHaveAttribute(
        'content',
        `${DOMAIN}/image/og-cover.png`,
      );
      await expect(meta(page, 'property', 'og:image:width')).toHaveAttribute('content', '1200');
      await expect(meta(page, 'property', 'og:image:height')).toHaveAttribute('content', '630');
      await expect(meta(page, 'name', 'twitter:card')).toHaveAttribute(
        'content',
        'summary_large_image',
      );
      await expect(meta(page, 'name', 'twitter:title')).toHaveAttribute('content', title);
    });

    test('déclare l’identité (rel=me, auteur, couleurs de thème) et les icônes', async ({
      page,
    }) => {
      await expect(page.locator('link[rel="me"]')).toHaveCount(2);
      await expect(meta(page, 'name', 'author')).toHaveAttribute('content', 'Paul Perigault');
      await expect(page.locator('meta[name="theme-color"]')).toHaveCount(2);
      await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
        'href',
        '/apple-touch-icon.png',
      );
      await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveCount(1);
    });

    test('publie un JSON-LD valide : personne, site, profil et listes', async ({ page }) => {
      const raw = await page.locator('script[type="application/ld+json"]').textContent();
      const graph = JSON.parse(raw ?? '{}')['@graph'] as {
        '@type': string;
        [key: string]: unknown;
      }[];
      expect(graph.map((node) => node['@type'])).toEqual(
        expect.arrayContaining(['Person', 'WebSite', 'ProfilePage', 'ItemList']),
      );
      const profile = graph.find((node) => node['@type'] === 'ProfilePage');
      expect(profile?.['inLanguage']).toBe(lang);
      expect(graph.find((node) => node['@type'] === 'Person')?.['name']).toBe('Paul Perigault');
    });

    test('n’a qu’un seul canonical, un seul titre et un seul JSON-LD', async ({ page }) => {
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
      await expect(page.locator('head title')).toHaveCount(1);
      await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
    });
  });
}
