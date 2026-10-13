import { expect, test, type Page } from '@playwright/test';
import { SITE } from '../src/config/site';
import { fillValid, mockTurnstile, mockWorker } from './helpers/contact';

declare global {
  interface Window {
    __cspViolations: string[];
  }
}

const WORKER_ORIGIN = new URL(SITE.contactEndpoint).origin;

const policyOf = async (page: Page): Promise<string> =>
  (await page.locator('meta[http-equiv="content-security-policy"]').getAttribute('content')) ?? '';

/** Sources de chaque directive, hors empreintes des scripts et styles inline. */
const directivesOf = async (page: Page): Promise<Record<string, string[]>> =>
  Object.fromEntries(
    (await policyOf(page)).split(';').map((directive) => {
      const [name = '', ...sources] = directive.trim().split(/\s+/);
      return [name, sources.filter((source) => !source.startsWith("'sha256-"))];
    }),
  );

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      window.__cspViolations.push(`${event.violatedDirective} → ${event.blockedURI}`);
    });
  });
});

test('la CSP ne s’ouvre qu’au Worker et à Turnstile, et seulement sur les pages du formulaire', async ({
  page,
}) => {
  await page.goto('/fr/');
  const directives = await directivesOf(page);
  expect(directives['connect-src']).toEqual(["'self'", WORKER_ORIGIN, SITE.turnstileOrigin]);
  expect(directives['frame-src']).toEqual([SITE.turnstileOrigin]);
  expect(directives['script-src']).toEqual(["'self'", SITE.turnstileOrigin]);
  for (const path of ['/fr/legal/', '/en/styleguide/', '/introuvable/']) {
    await page.goto(path);
    expect(await policyOf(page), path).not.toMatch(/https?:/);
  }
});

for (const lang of ['fr', 'en'] as const) {
  test(`zéro violation CSP pendant l’envoi du formulaire (${lang})`, async ({ page }) => {
    await mockTurnstile(page);
    await mockWorker(page);
    await page.goto(`/${lang}/`);
    await fillValid(page, lang);
    await page.locator('[data-contact-form] button[type="submit"]').click();
    await expect(page.locator('[data-form-status]')).not.toBeEmpty();
    expect(await page.evaluate(() => window.__cspViolations)).toEqual([]);
  });
}
