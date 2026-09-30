import { expect, test } from '@playwright/test';

test.describe('fichiers destinés aux robots', () => {
  test('le sitemap liste /fr/ et /en/ avec leurs alternates, sans page technique ni racine', async ({
    request,
  }) => {
    const index = await request.get('/sitemap-index.xml');
    expect(index.status()).toBe(200);
    expect(await index.text()).toContain('/sitemap-0.xml');

    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    for (const lang of ['fr', 'en']) {
      expect(sitemap).toContain(`<loc>https://paulperigault.fr/${lang}/</loc>`);
      expect(sitemap).toContain(`hreflang="${lang}" href="https://paulperigault.fr/${lang}/"`);
    }
    expect(sitemap).not.toContain('styleguide');
    expect(sitemap).not.toContain('<loc>https://paulperigault.fr/</loc>');
  });

  test('chaque lastmod du sitemap est une date valide, jamais dans le futur', async ({
    request,
  }) => {
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    const dates = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map(
      (match) => match[1] ?? '',
    );
    expect(dates.length).toBeGreaterThan(0);
    for (const date of dates) {
      expect(new Date(date).getTime()).toBeLessThanOrEqual(Date.now());
    }
  });

  test('le CV est servi par le site lui-même, en vrai PDF', async ({ request }) => {
    const cv = await request.get('/cv-paul-perigault.pdf');
    expect(cv.status()).toBe(200);
    expect(cv.headers()['content-type']).toContain('application/pdf');
    expect((await cv.body()).subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  test('robots.txt pointe vers le sitemap généré', async ({ request }) => {
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain('Sitemap: https://paulperigault.fr/sitemap-index.xml');
  });

  test('l’image Open Graph existe', async ({ request }) => {
    const image = await request.get('/image/og-cover.png');
    expect(image.status()).toBe(200);
    expect(image.headers()['content-type']).toContain('image/png');
  });

  test('une page inconnue renvoie une 404 utile, non indexable', async ({ page }) => {
    const response = await page.goto('/introuvable/');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Page introuvable');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.getByRole('link', { name: 'Français' })).toHaveAttribute('href', '/fr/');
    await expect(page.getByRole('link', { name: 'English' })).toHaveAttribute('href', '/en/');
  });
});
