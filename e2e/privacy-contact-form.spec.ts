import { expect, test, type Page } from '@playwright/test';
import { SITE } from '../src/config/site';
import { fillValid, formCopy, mockTurnstile, mockWorker } from './helpers/contact';

/**
 * Vie privée du formulaire de contact (Turnstile et Worker simulés : aucune requête réelle).
 * Ce que fait le vrai Turnstile est mesuré par `measure-turnstile.spec.ts` (opt-in, hors CI).
 */
const WORKER_ORIGIN = new URL(SITE.contactEndpoint).origin;

const foreignOrigins = (page: Page, siteOrigin: string) => {
  const origins: string[] = [];
  page.on('request', (request) => {
    const { protocol, origin } = new URL(request.url());
    if (protocol.startsWith('http') && origin !== siteOrigin) origins.push(origin);
  });
  return origins;
};

const siteStorage = (page: Page) =>
  page.evaluate(() => ({ local: Object.keys(localStorage), session: sessionStorage.length }));

for (const lang of ['fr', 'en'] as const) {
  test.describe(`vie privée du formulaire de contact (${lang})`, () => {
    test('rien de tiers avant le focus ; ensuite Turnstile, puis le Worker à l’envoi', async ({
      page,
      baseURL,
    }) => {
      await mockTurnstile(page);
      await mockWorker(page);
      const origins = foreignOrigins(page, new URL(baseURL as string).origin);
      await page.goto(`/${lang}/`);
      await page.waitForLoadState('networkidle');
      expect(origins).toEqual([]);
      await fillValid(page, lang);
      await expect.poll(() => [...new Set(origins)]).toEqual([SITE.turnstileOrigin]);
      await page.getByRole('button', { name: formCopy(lang)['submit'] ?? '' }).click();
      await expect(page.getByRole('status')).toHaveText(formCopy(lang)['sent'] ?? '');
      expect([...new Set(origins)].sort()).toEqual([SITE.turnstileOrigin, WORKER_ORIGIN].sort());
    });

    test('aucun cookie et stockage du site inchangé après un envoi', async ({ page, context }) => {
      await mockTurnstile(page);
      await mockWorker(page);
      await page.goto(`/${lang}/`);
      await fillValid(page, lang);
      await page.getByRole('button', { name: formCopy(lang)['submit'] ?? '' }).click();
      await expect(page.getByRole('status')).toHaveText(formCopy(lang)['sent'] ?? '');
      expect(await context.cookies()).toEqual([]);
      expect(await siteStorage(page)).toEqual({ local: [], session: 0 });
    });

    test('la page de confidentialité décrit le formulaire, Turnstile et les sous-traitants', async ({
      page,
    }) => {
      await page.goto(`/${lang}/legal/`);
      const section = page.locator('#contact-title').locator('..');
      for (const fact of ['Turnstile', 'Resend', 'Cloudflare', SITE.email, 'cf.turnstile.u']) {
        await expect(section, fact).toContainText(fact);
      }
    });
  });
}
