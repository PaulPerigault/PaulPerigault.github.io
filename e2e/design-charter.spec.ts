import { expect, test, type Page } from '@playwright/test';

/** Couleurs autorisées : les tokens, résolus par le navigateur dans le thème courant (+ transparent). */
const allowedColors = (page: Page) =>
  page.evaluate(() => {
    const probe = document.createElement('span');
    document.body.append(probe);
    const resolve = (token: string) => {
      probe.style.color = `var(${token})`;
      return getComputedStyle(probe).color;
    };
    const tokens = [
      '--pp-bg',
      '--pp-surface',
      '--pp-fg',
      '--pp-muted',
      '--pp-line',
      '--pp-control',
      '--pp-accent',
      '--pp-on-accent',
    ];
    const colors = ['rgba(0, 0, 0, 0)', ...tokens.map(resolve)];
    probe.remove();
    return colors;
  });

const decorativeStyles = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('body, body *')].flatMap((element) => {
      const style = getComputedStyle(element);
      const found: string[] = [];
      if (style.backgroundImage.includes('gradient')) found.push('gradient');
      if (style.boxShadow !== 'none') found.push('box-shadow');
      if (style.textShadow !== 'none') found.push('text-shadow');
      if (style.backdropFilter !== 'none' && style.backdropFilter !== '')
        found.push('backdrop-filter');
      if (style.filter !== 'none') found.push('filter');
      if (parseFloat(style.borderTopLeftRadius) > 4) found.push('radius');
      return found.map((kind) => `${element.tagName.toLowerCase()}.${element.className} : ${kind}`);
    }),
  );

const usedColors = (page: Page) =>
  page.evaluate(() => [
    ...new Set(
      [...document.querySelectorAll('body, body *')].flatMap((element) => {
        const style = getComputedStyle(element);
        return [style.color, style.backgroundColor, style.borderTopColor];
      }),
    ),
  ]);

for (const lang of ['fr', 'en'] as const) {
  for (const scheme of ['light', 'dark'] as const) {
    test.describe(`charte de design (${lang}, ${scheme})`, () => {
      test.use({ colorScheme: scheme });

      test.beforeEach(async ({ page }) => {
        await page.goto(`/${lang}/`);
      });

      test('aucun dégradé, ombre, flou, filtre ni grand arrondi', async ({ page }) => {
        expect(await decorativeStyles(page)).toEqual([]);
      });

      test('n’utilise que les couleurs des tokens (un seul accent)', async ({ page }) => {
        const allowed = await allowedColors(page);
        const foreign = (await usedColors(page)).filter((color) => !allowed.includes(color));
        expect(foreign).toEqual([]);
      });

      test('une seule famille typographique, auto-hébergée et réellement chargée', async ({
        page,
      }) => {
        const state = await page.evaluate(async () => {
          await document.fonts.ready;
          const faces = [...document.fonts].filter((face) => face.status === 'loaded');
          const families = ['h1', 'h2', 'h3', 'body'].map(
            (selector) => getComputedStyle(document.querySelector(selector) as Element).fontFamily,
          );
          return { families, loaded: faces.map((face) => face.family) };
        });
        for (const family of state.families) {
          expect(family).toContain('Atkinson Hyperlegible Next Variable');
        }
        expect(state.loaded).toContain('Atkinson Hyperlegible Next Variable');
        expect(
          await page.locator('main [class*="font-mono"], main [class*="font-serif"]').count(),
        ).toBe(0);
      });

      test('pas de numérotation ni d’étiquette décorative devant les titres', async ({ page }) => {
        for (const title of await page.locator('h2').allTextContents()) {
          expect(title.trim()).not.toMatch(/^\d+\s*[—–-]/);
        }
        await expect(page.locator('[class*="uppercase"][class*="tracking"]')).toHaveCount(0);
      });

      test('n’affiche aucun emoji', async ({ page }) => {
        const text = await page.locator('body').innerText();
        expect(text).not.toMatch(/\p{Emoji_Presentation}/u);
      });
    });
  }
}
