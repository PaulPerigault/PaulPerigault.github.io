import { writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

/**
 * Mesure (pas un test de non-régression) : ce que le **vrai** Turnstile fait chez le visiteur.
 * Opt-in, hors CI : `MEASURE_TURNSTILE=1 npx playwright test measure-turnstile`. Réseau réel vers
 * Cloudflare. Résultat écrit dans `test-results/turnstile-measure.json` puis reporté à la main
 * dans `docs/compliance.md`. `MEASURE_URL` permet de viser la production après déploiement.
 */
test.skip(process.env['MEASURE_TURNSTILE'] !== '1', 'mesure opt-in (MEASURE_TURNSTILE=1)');

const target = process.env['MEASURE_URL'] ?? '/fr/';

test('requêtes, cookies et stockage avant et après le premier focus', async ({ page, context }) => {
  const requests: { phase: string; method: string; url: string; type: string }[] = [];
  let phase = 'chargement';
  await page.addInitScript(() => {
    (window as unknown as { csp: string[] }).csp = [];
    document.addEventListener('securitypolicyviolation', (e) =>
      (window as unknown as { csp: string[] }).csp.push(`${e.violatedDirective} ${e.blockedURI}`),
    );
  });
  page.on('request', (request) => {
    requests.push({
      phase,
      method: request.method(),
      url: request.url(),
      type: request.resourceType(),
    });
  });
  await page.goto(target);
  await page.waitForLoadState('networkidle');
  const before = await context.cookies();
  phase = 'après focus';
  await page.locator('[data-contact-form] input[name="name"]').focus();
  await page.waitForTimeout(8000);
  const frames = await Promise.all(
    page
      .frames()
      .filter((frame) => frame !== page.mainFrame())
      .map(async (frame) => ({
        url: frame.url(),
        storage: await frame
          .evaluate(() => ({
            local: Object.keys(localStorage),
            session: Object.keys(sessionStorage),
          }))
          .catch((error: unknown) => String(error)),
      })),
  );
  const report = {
    measuredAt: new Date().toISOString(),
    target: page.url(),
    foreignRequests: requests.filter((r) => new URL(r.url).origin !== new URL(page.url()).origin),
    cookiesBeforeFocus: before,
    cookiesAfterFocus: await context.cookies(),
    pageStorage: await page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
    })),
    frames,
    cspViolations: await page.evaluate(() => (window as unknown as { csp: string[] }).csp),
  };
  writeFileSync('test-results/turnstile-measure.json', JSON.stringify(report, null, 2));
  expect(report.foreignRequests.filter((r) => r.phase === 'chargement')).toEqual([]);
  expect(report.cspViolations).toEqual([]);
});
