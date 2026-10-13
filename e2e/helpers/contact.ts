import type { Page, Request } from '@playwright/test';
import { SITE } from '../../src/config/site';
import { loadContent, type TestLang } from './content';

/**
 * Doubles du Worker et de Turnstile : aucune requête réelle ne part en CI. Le faux Turnstile est
 * servi depuis la vraie origine (la CSP de la page s'applique donc comme en production).
 */
export const FAKE_TOKEN = 'fake-turnstile-token';

const FAKE_TURNSTILE = `window.turnstile = {
  render: function (el) { el.setAttribute('data-fake-turnstile', ''); return 'w1'; },
  getResponse: function () { return '${FAKE_TOKEN}'; },
  reset: function () { window.__turnstileResets = (window.__turnstileResets || 0) + 1; },
};`;

export async function mockTurnstile(page: Page): Promise<string[]> {
  const requested: string[] = [];
  await page.route(`${SITE.turnstileOrigin}/**`, (route) => {
    requested.push(route.request().url());
    return route.fulfill({ contentType: 'text/javascript', body: FAKE_TURNSTILE });
  });
  return requested;
}

interface Reply {
  status?: number;
  body?: unknown;
  delayMs?: number;
  abort?: boolean;
}

const cors = (request: Request) => ({
  'Access-Control-Allow-Origin': request.headers()['origin'] ?? '',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
});

/** Simule le Worker ; renvoie les corps JSON reçus (préflight CORS géré comme le vrai). */
export async function mockWorker(page: Page, reply: Reply = {}): Promise<unknown[]> {
  const received: unknown[] = [];
  await page.route(`${SITE.contactEndpoint}**`, async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS')
      return route.fulfill({ status: 204, headers: cors(request) });
    received.push(request.postDataJSON());
    if (reply.delayMs) await new Promise((done) => setTimeout(done, reply.delayMs));
    if (reply.abort) return route.abort('failed');
    return route.fulfill({
      status: reply.status ?? 200,
      headers: cors(request),
      contentType: 'application/json',
      body: JSON.stringify(reply.body ?? { ok: true }),
    });
  });
  return received;
}

type FormCopy = Record<string, string>;

/** Textes du formulaire, lus dans `ui.json` (jamais recopiés). */
export const formCopy = (lang: TestLang): FormCopy =>
  loadContent<{ contact: { form: FormCopy } }>(lang, 'ui').contact.form;

export async function fillValid(page: Page, lang: TestLang): Promise<void> {
  const copy = formCopy(lang);
  await page.getByLabel(copy['name'] ?? '', { exact: true }).fill('Ada Lovelace');
  await page.getByLabel(copy['email'] ?? '', { exact: true }).fill('ada@example.org');
  await page
    .getByLabel(copy['message'] ?? '', { exact: true })
    .fill('Bonjour, un message de test.');
}
