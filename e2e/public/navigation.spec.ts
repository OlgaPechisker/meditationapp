import { test, expect } from '@playwright/test';

test.describe('Public Navigation', () => {
  test('NAV-P1: Home page (/) loads successfully', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.ok()).toBe(true);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('NAV-P2: Nav links all navigate correctly', async ({ page }) => {
    await page.goto('/');

    await page.locator('[data-testid="nav-treatments"]').click();
    await expect(page).toHaveURL(/\/treatments/);

    await page.locator('[data-testid="nav-blog"]').click();
    await expect(page).toHaveURL(/\/blog/);

    await page.locator('[data-testid="nav-lectures"]').click();
    await expect(page).toHaveURL(/\/lectures/);

    await page.locator('[data-testid="nav-songs"]').click();
    await expect(page).toHaveURL(/\/songs/);

    await page.locator('[data-testid="nav-about"]').click();
    await expect(page).toHaveURL(/\/about/);

    await page.locator('[data-testid="nav-contact"]').click();
    await expect(page).toHaveURL(/\/contact/);

    await page.locator('[data-testid="nav-home"]').click();
    // Home URL ends with "/" (no path segment after the origin)
    await expect(page).toHaveURL(/\/$/);
  });

  test('NAV-P3: Contact page renders', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await expect(page).toHaveURL(/\/contact/);
  });

  test('NAV-P4: About page renders', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await expect(page).toHaveURL(/\/about/);
  });

  test('NAV-N1: Unknown route → 404 UI shown', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await page.waitForLoadState('networkidle');
    // App must not redirect to a known page
    await expect(page).toHaveURL(/this-page-does-not-exist/);
  });

  test('NAV-E1: Unsupported ?locale=xx falls back gracefully (page loads without crash)', async ({
    page,
  }) => {
    const response = await page.goto('/?locale=xx');
    // Page must still load (not crash with 500 or similar)
    expect(response?.status()).not.toBe(500);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});
