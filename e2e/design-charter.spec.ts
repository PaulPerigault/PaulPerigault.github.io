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

      test('applique la typographie : serif pour les titres, mono pour les métadonnées', async ({
        page,
      }) => {
        const families = await page.evaluate(() => ({
          heading: getComputedStyle(document.querySelector('h1') as Element).fontFamily,
          section: getComputedStyle(document.querySelector('h2') as Element).fontFamily,
          meta: getComputedStyle(document.querySelector('.font-mono') as Element).fontFamily,
          body: getComputedStyle(document.body).fontFamily,
        }));
        expect(families.heading).toContain('Iowan Old Style');
        expect(families.section).toContain('Iowan Old Style');
        expect(families.meta).toContain('ui-monospace');
        expect(families.body).toContain('ui-sans-serif');
      });

      test('n’affiche aucun emoji', async ({ page }) => {
        const text = await page.locator('body').innerText();
        expect(text).not.toMatch(/\p{Emoji_Presentation}/u);
      });
    });
  }
}
