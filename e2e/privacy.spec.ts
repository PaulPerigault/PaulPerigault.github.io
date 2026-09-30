import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const PAGES = ['/fr/', '/en/', '/fr/legal/', '/en/legal/'] as const;
const ALLOWED_STORAGE = ['theme', 'lang'];
const TRACKERS =
  /googletagmanager|google-analytics|gtag\(|plausible|matomo|hotjar|clarity\.ms|facebook\.net|fbq\(|doubleclick|segment\.com|mixpanel|sentry/i;

/** Enregistre toute requête et toute réponse portant un Set-Cookie. */
const watch = (page: Page, siteOrigin: string) => {
  const foreign: string[] = [];
  const cookieHeaders: string[] = [];
  page.on('request', (request) => {
    const { protocol, origin } = new URL(request.url());
    if (protocol.startsWith('http') && origin !== siteOrigin) foreign.push(request.url());
  });
  page.on('response', (response) => {
    if (response.headers()['set-cookie']) cookieHeaders.push(response.url());
  });
  return { foreign, cookieHeaders };
};

const storageKeys = (page: Page) => page.evaluate(() => Object.keys(localStorage));

for (const path of PAGES) {
  test.describe(`vie privée ${path}`, () => {
    test('ne fait aucune requête vers un tiers et ne reçoit aucun Set-Cookie', async ({
      page,
      baseURL,
    }) => {
      const { foreign, cookieHeaders } = watch(page, new URL(baseURL as string).origin);
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      expect(foreign).toEqual([]);
      expect(cookieHeaders).toEqual([]);
    });

    test('ne contient ni iframe, ni script tiers, ni outil de mesure d’audience', async ({
      page,
    }) => {
      await page.goto(path);
      const html = await page.content();
      expect(html).not.toMatch(TRACKERS);
      await expect(page.locator('iframe, embed, object')).toHaveCount(0);
      const scriptOrigins = await page
        .locator('script[src]')
        .evaluateAll((nodes) =>
          nodes.map((node) => new URL((node as HTMLScriptElement).src).origin),
        );
      for (const origin of scriptOrigins) expect(origin).toBe(new URL(page.url()).origin);
    });
  });
}

test.describe('traces laissées chez le visiteur', () => {
  const journey = async (page: Page, context: BrowserContext) => {
    await page.goto('/fr/');
    await page.locator('[data-theme-toggle]').click();
    await page.locator('[data-lang-switch]').click();
    await page.goto('/en/legal/');
    return { cookies: await context.cookies(), keys: await storageKeys(page) };
  };

  test('aucun cookie, et seulement les préférences « theme » et « lang » en stockage local', async ({
    page,
    context,
  }) => {
    const { cookies, keys } = await journey(page, context);
    expect(cookies).toEqual([]);
    expect(keys.sort()).toEqual([...ALLOWED_STORAGE].sort());
  });

  test('sans interaction, rien n’est écrit du tout', async ({ page, context }) => {
    await page.goto('/fr/');
    expect(await context.cookies()).toEqual([]);
    expect(await storageKeys(page)).toEqual([]);
    expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
    expect(await page.evaluate(async () => (await indexedDB.databases()).length)).toBe(0);
  });

  test('les préférences ne contiennent que des valeurs attendues', async ({ page, context }) => {
    await journey(page, context);
    const values = await page.evaluate(() => ({
      theme: localStorage.theme,
      lang: localStorage.lang,
    }));
    expect(['light', 'dark']).toContain(values.theme);
    expect(['fr', 'en']).toContain(values.lang);
  });
});
