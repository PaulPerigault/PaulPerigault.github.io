import { expect, test } from '@playwright/test';

// Régression visuelle (#201) : filet du futur design system (#182). Captures pleine page comparées
// à des références versionnées, générées dans la même image Playwright que le job CI `visual`
// (`npm run test:visual:update`, docs/visual-regression.md). Ailleurs (shards e2e, macOS, Windows),
// le rendu des polices diffère : ces tests ne tournent qu'avec VISUAL=1.
test.skip(process.env['VISUAL'] !== '1', 'régression visuelle : job CI `visual` uniquement');

const PAGES = [
  { path: '/fr/', name: 'fr' },
  { path: '/en/', name: 'en' },
  { path: '/404.html', name: '404' },
];
const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 390, height: 844 },
};
const SCHEMES = ['light', 'dark'] as const;
// Feuille appliquée par Playwright pendant la capture (pas un <style> injecté : la CSP le bloque).
const STYLE_PATH = 'e2e/visual-volatile.css';

for (const { path, name } of PAGES) {
  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    for (const scheme of SCHEMES) {
      test(`${name} · ${device} · ${scheme}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        await expect(page).toHaveScreenshot(`${name}-${device}-${scheme}.png`, {
          fullPage: true,
          animations: 'disabled',
          caret: 'hide',
          stylePath: STYLE_PATH,
          maxDiffPixelRatio: 0.001,
        });
      });
    }
  }
}
