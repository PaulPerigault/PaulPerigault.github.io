import { expect, test } from '@playwright/test';
import { SITE } from '../src/config/site';
import { FAKE_TOKEN, fillValid, formCopy, mockTurnstile, mockWorker } from './helpers/contact';

for (const lang of ['fr', 'en'] as const) {
  const copy = formCopy(lang);
  const field = (name: string) => copy[name] ?? '';

  test.describe(`formulaire de contact : envoi (${lang})`, () => {
    test.beforeEach(async ({ page }) => {
      await mockTurnstile(page);
    });

    test('envoi réussi : contenu, jeton et piège vide transmis, formulaire vidé', async ({
      page,
    }) => {
      const received = await mockWorker(page);
      await page.goto(`/${lang}/`);
      await fillValid(page, lang);
      await page.getByRole('button', { name: field('submit') }).press('Enter');
      await expect(page.getByRole('status')).toHaveText(field('sent'));
      expect(received).toEqual([
        {
          name: 'Ada Lovelace',
          email: 'ada@example.org',
          message: 'Bonjour, un message de test.',
          website: '',
          turnstileToken: FAKE_TOKEN,
        },
      ]);
      await expect(page.getByLabel(field('name'), { exact: true })).toHaveValue('');
    });

    test('bouton désactivé et état annoncé pendant l’envoi', async ({ page }) => {
      await mockWorker(page, { delayMs: 800 });
      await page.goto(`/${lang}/`);
      await fillValid(page, lang);
      const button = page.getByRole('button', { name: field('submit') });
      await button.click();
      await expect(button).toBeDisabled();
      await expect(page.getByRole('status')).toHaveText(field('sending'));
      await expect(button).toBeEnabled();
    });

    test('vérification anti-robot refusée : message dédié, saisie conservée', async ({ page }) => {
      await mockWorker(page, { status: 403, body: { ok: false, error: 'challenge' } });
      await page.goto(`/${lang}/`);
      await fillValid(page, lang);
      await page.getByRole('button', { name: field('submit') }).click();
      await expect(page.getByRole('status')).toHaveText(field('challenge'));
      await expect(page.getByLabel(field('name'), { exact: true })).toHaveValue('Ada Lovelace');
    });

    test('champ refusé par le serveur : signalé sur ce champ', async ({ page }) => {
      await mockWorker(page, {
        status: 400,
        body: { ok: false, error: 'invalid', fields: ['name'] },
      });
      await page.goto(`/${lang}/`);
      await fillValid(page, lang);
      await page.getByRole('button', { name: field('submit') }).click();
      const name = page.getByLabel(field('name'), { exact: true });
      await expect(name).toHaveAttribute('aria-invalid', 'true');
      await expect(name).toHaveAccessibleDescription(field('error_rejected'));
    });

    test('trop d’envois rapprochés (429) : invitation à patienter', async ({ page }) => {
      await mockWorker(page, { status: 429, body: { ok: false, error: 'rate_limited' } });
      await page.goto(`/${lang}/`);
      await fillValid(page, lang);
      await page.getByRole('button', { name: field('submit') }).click();
      await expect(page.getByRole('status')).toHaveText(field('rate_limited'));
    });

    for (const [label, reply] of [
      ['erreur du service', { status: 502, body: { ok: false, error: 'unavailable' } }],
      ['panne réseau', { abort: true }],
    ] as const) {
      test(`${label} : message générique avec l’adresse e-mail de repli`, async ({ page }) => {
        await mockWorker(page, reply);
        await page.goto(`/${lang}/`);
        await fillValid(page, lang);
        await page.getByRole('button', { name: field('submit') }).click();
        const expected = field('unavailable').replace('{email}', SITE.email);
        await expect(page.getByRole('status')).toHaveText(expected);
      });
    }
  });
}
