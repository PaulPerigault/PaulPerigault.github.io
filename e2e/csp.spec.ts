import { createHash } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

declare global {
  interface Window {
    __cspViolations: string[];
  }
}

const hash = (source: string) => `'sha256-${createHash('sha256').update(source).digest('base64')}'`;

/** Enregistre chaque violation de CSP dès le début du chargement, sur toutes les navigations. */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      window.__cspViolations.push(`${event.violatedDirective} → ${event.blockedURI}`);
    });
  });
});

const violations = (page: Page) => page.evaluate(() => window.__cspViolations);

const policyOf = async (page: Page): Promise<string> =>
  (await page.locator('meta[http-equiv="content-security-policy"]').getAttribute('content')) ?? '';

test.describe('politique CSP', () => {
  test('est stricte : tout interdit par défaut, aucun unsafe-inline / unsafe-eval', async ({
    page,
  }) => {
    await page.goto('/fr/');
    const policy = await policyOf(page);
    for (const directive of [
      "default-src 'none'",
      "connect-src 'self'",
      "base-uri 'none'",
      "form-action 'none'",
      "object-src 'none'",
      "frame-src 'none'",
    ]) {
      expect(policy).toContain(directive);
    }
    expect(policy).toMatch(/script-src 'self'/);
    expect(policy).not.toMatch(/unsafe-inline|unsafe-eval|https?:/);
  });

  test('autorise chaque script inline exécutable par son empreinte exacte', async ({ page }) => {
    await page.goto('/fr/');
    const policy = await policyOf(page);
    const inline = await page
      .locator('script:not([src]):not([type="application/ld+json"])')
      .allTextContents();
    expect(inline.length).toBeGreaterThan(0);
    for (const source of inline) expect(policy).toContain(hash(source));
  });

  test('est réellement appliquée : un script inline injecté est bloqué et signalé', async ({
    page,
  }) => {
    await page.goto('/fr/');
    await page.evaluate(() => {
      const canary = document.createElement('script');
      canary.textContent = 'window.pwned = true';
      document.body.append(canary);
    });
    expect(await page.evaluate(() => 'pwned' in window)).toBe(false);
    expect(await violations(page)).toEqual([expect.stringContaining('script-src')]);
  });

  test('la page racine et la 404 portent aussi une politique', async ({ page }) => {
    for (const path of ['/', '/introuvable/']) {
      await page.goto(path);
      expect(await policyOf(page), path).toContain("default-src 'none'");
    }
  });
});

for (const lang of ['fr', 'en'] as const) {
  test.describe(`zéro violation CSP (${lang})`, () => {
    test('au chargement de chaque type de page', async ({ page }) => {
      for (const path of [`/${lang}/`, `/${lang}/styleguide/`, '/introuvable/']) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        expect(await violations(page), path).toEqual([]);
      }
    });

    test('pendant un parcours complet : thème, ancres, changement de langue', async ({ page }) => {
      await page.goto(`/${lang}/`);
      await page.locator('[data-theme-toggle]').click();
      await page.locator('[data-theme-toggle]').click();
      await page.locator('nav a[href$="#skills"]').first().click();
      await page.reload();
      expect(await violations(page)).toEqual([]);
      await page.locator('[data-lang-switch]').click();
      await page.waitForLoadState('networkidle');
      expect(await violations(page)).toEqual([]);
    });

    test('pendant l’usage du menu mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 700 });
      await page.goto(`/${lang}/`);
      await page.locator('[data-menu-open]').click();
      await page.keyboard.press('Escape');
      expect(await violations(page)).toEqual([]);
    });
  });
}
