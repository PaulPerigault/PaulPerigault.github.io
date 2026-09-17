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
    await expect(page.locator('a[href="mailto:contact@paulperigault.fr"]').last()).toBeVisible();
  });

  test('footer renders with domain', async ({ page }) => {
    await expect(page.locator('footer')).toContainText('paulperigault');
  });

  test('navigation buttons count is correct', async ({ page }) => {
    const navItems = page.locator('nav ul button');
    await expect(navItems).toHaveCount(7);
  });

  test('mobile menu button exposes aria-expanded and aria-label', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const menuBtn = page.locator('nav button[aria-controls="pp-mobile-menu"]');
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'false');
    await expect(menuBtn).toHaveAttribute('aria-label', /menu/i);
    await menuBtn.click();
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'true');
  });

  test('interactive elements show a visible focus outline', async ({ page }) => {
    const themeBtn = page.locator('nav button[aria-label*="mode"]');
    await themeBtn.focus();
    await expect(themeBtn).toBeFocused();
    const outline = await themeBtn.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe('none');
  });

  test('clicking a nav link scrolls the matching anchor section into view', async ({ page }) => {
    const contactSection = page.locator('#contact');
    await expect(contactSection).not.toBeInViewport();

    await page
      .locator('nav ul button')
      .filter({ hasText: /contact/i })
      .first()
      .click();

    await expect(contactSection).toBeInViewport({ timeout: 5000 });
  });

  test('projects section renders a repo card fetched live from the github api', async ({
    page,
  }) => {
    // Client hydration's HTTP transfer cache reuses the SSR-time GitHub API response, so a
    // page.route() mock here would never see a network request to intercept. This asserts the
    // end-to-end facade -> github.service -> live GitHub API chain instead, against the one repo
    // configured in public/data/fr/projects-config.json.
    const projectsSection = page.locator('#projects');
    await projectsSection.scrollIntoViewIfNeeded();

    const card = projectsSection.locator(
      'a[href="https://github.com/PaulPerigault/GetUrlCloudRun"]',
    );
    await expect(card).toBeVisible({ timeout: 10000 });
    await expect(card).toContainText('GetUrlCloudRun');
    await expect(card).toContainText('Go');
  });
});
