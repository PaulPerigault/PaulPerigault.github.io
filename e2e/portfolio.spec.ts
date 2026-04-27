import { test, expect } from '@playwright/test';

test.describe('portfolio', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible({ timeout: 15000 });
  });

  test('page has correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Paul Perigault/);
  });

  test('navbar renders with logo text', async ({ page }) => {
    await expect(page.locator('nav')).toContainText('perigault');
  });

  test('hero section renders with full name', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Paul Perigault');
  });

  test('hero has github and linkedin links', async ({ page }) => {
    await expect(page.locator('a[href*=\"github.com/PaulPerigault\"]').first()).toBeVisible();
    await expect(page.locator('a[href*=\"linkedin.com/in/paul-perigault\"]').first()).toBeVisible();
  });

  test('language switcher exists and toggles', async ({ page }) => {
    const langBtn = page.locator('nav button').filter({ hasText: /EN|FR/ });
    await expect(langBtn).toBeVisible();
    const before = (await langBtn.textContent())?.trim();
    await langBtn.click();
    await expect
      .poll(async () => (await langBtn.textContent())?.trim(), { timeout: 5000 })
      .not.toBe(before);
  });

  test('theme toggle switches dark mode', async ({ page }) => {
    const buttons = page.locator('nav button');
    const count = await buttons.count();
    const themeBtn = buttons.nth(count - 2);
    await themeBtn.click();
    await expect(page.locator('html')).toHaveClass(/dark/, { timeout: 2000 });
  });

  test('skills section renders categories', async ({ page }) => {
    await expect(page.locator('text=Cloud').first()).toBeVisible({ timeout: 10000 });
    const dockerItem = page.locator('li').filter({ hasText: 'Docker' }).first();
    await dockerItem.scrollIntoViewIfNeeded();
    await expect(dockerItem).toBeVisible({ timeout: 10000 });
  });

  test('experience section shows wevii', async ({ page }) => {
    await expect(page.locator('text=WeVii').first()).toBeVisible({ timeout: 10000 });
  });

  test('formation section shows esiea', async ({ page }) => {
    await expect(page.locator('text=ESIEA').first()).toBeVisible({ timeout: 10000 });
  });

  test('certifications shows cloud digital leader', async ({ page }) => {
    await expect(page.locator('text=Cloud Digital Leader')).toBeVisible({ timeout: 10000 });
  });

  test('contact section has email link', async ({ page }) => {
    await expect(page.locator('a[href="mailto:contact@paulperigault"]').last()).toBeVisible();
  });

  test('footer renders with domain', async ({ page }) => {
    await expect(page.locator('footer')).toContainText('paulperigault');
  });

  test('navigation buttons count is correct', async ({ page }) => {
    const navItems = page.locator('nav ul button');
    await expect(navItems).toHaveCount(5);
  });
});
