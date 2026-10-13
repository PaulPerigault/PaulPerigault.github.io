import { expect, test } from '@playwright/test';
import { SITE } from '../src/config/site';
import { formCopy, mockTurnstile, mockWorker } from './helpers/contact';

for (const lang of ['fr', 'en'] as const) {
  const copy = formCopy(lang);
  const field = (name: string) => copy[name] ?? '';

  test.describe(`formulaire de contact : chargement et validation (${lang})`, () => {
    test('Turnstile n’est chargé qu’au premier focus, depuis son URL exacte', async ({ page }) => {
      const requested = await mockTurnstile(page);
      await page.goto(`/${lang}/`);
      await page.waitForLoadState('networkidle');
      expect(requested).toEqual([]);
      await page.getByLabel(field('name'), { exact: true }).focus();
      await expect.poll(() => requested).toEqual([SITE.turnstileScriptUrl]);
      await expect(page.locator('[data-fake-turnstile]')).toHaveCount(1);
    });

    test('champs vides : erreurs annoncées, focus sur le premier, rien n’est envoyé', async ({
      page,
    }) => {
      await mockTurnstile(page);
      const received = await mockWorker(page);
      await page.goto(`/${lang}/`);
      await page.getByRole('button', { name: field('submit') }).click();
      const name = page.getByLabel(field('name'), { exact: true });
      await expect(name).toBeFocused();
      for (const label of ['name', 'email', 'message']) {
        const control = page.getByLabel(field(label), { exact: true });
        await expect(control).toHaveAttribute('aria-invalid', 'true');
        await expect(control).toHaveAccessibleDescription(field('error_required'));
      }
      await expect(page.getByRole('status')).toHaveText(field('invalid'));
      expect(received).toEqual([]);
    });

    test('e-mail incomplet : message précis, corrigé dès le renvoi', async ({ page }) => {
      await mockTurnstile(page);
      await mockWorker(page);
      await page.goto(`/${lang}/`);
      const email = page.getByLabel(field('email'), { exact: true });
      await email.fill('ada@');
      await page.getByRole('button', { name: field('submit') }).click();
      await expect(email).toHaveAccessibleDescription(field('error_email'));
      await email.fill('ada@example.org');
      await page.getByRole('button', { name: field('submit') }).click();
      await expect(email).not.toHaveAttribute('aria-invalid');
    });

    test('clavier : champs, lien de confidentialité puis bouton ; piège jamais atteint', async ({
      page,
    }) => {
      await mockTurnstile(page);
      await page.goto(`/${lang}/`);
      await page.getByLabel(field('name'), { exact: true }).focus();
      const order = [field('email'), field('message')];
      for (const label of order) {
        await page.keyboard.press('Tab');
        await expect(page.getByLabel(label, { exact: true })).toBeFocused();
      }
      await page.keyboard.press('Tab');
      await expect(page.getByRole('link', { name: field('privacy_link') })).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: field('submit') })).toBeFocused();
      await expect(page.getByRole('textbox', { name: field('honeypot') })).toHaveCount(0);
    });

    test('le lien de confidentialité mène à la page légale de la langue', async ({ page }) => {
      await page.goto(`/${lang}/`);
      await expect(page.getByRole('link', { name: field('privacy_link') })).toHaveAttribute(
        'href',
        `/${lang}/legal/`,
      );
    });
  });
}
