import { test, expect } from '@playwright/test';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin123';

test.describe('Authentication', () => {
  // All auth tests need a fresh, unauthenticated browser context
  test.use({ storageState: { cookies: [], origins: [] } });

  test('AUTH-P1: correct password → redirect to /admin/treatments', async ({ page }) => {
    await page.goto('/admin/login');
    await page.locator('[data-testid="password-input"]').fill(ADMIN_PASSWORD);
    await page.locator('[data-testid="login-submit"]').click();
    await expect(page).toHaveURL(/\/admin\/treatments/);
  });

  test('AUTH-P2: JWT persisted in localStorage; refresh → stays authenticated', async ({ page }) => {
    await page.goto('/admin/login');
    await page.locator('[data-testid="password-input"]').fill(ADMIN_PASSWORD);
    await page.locator('[data-testid="login-submit"]').click();
    await expect(page).toHaveURL(/\/admin\/treatments/);

    const token = await page.evaluate(() => localStorage.getItem('einat_token'));
    expect(token).toBeTruthy();

    await page.reload();
    await expect(page).toHaveURL(/\/admin\/treatments/);
  });

  test('AUTH-P3: Clearing token → /admin/treatments redirects to /admin/login', async ({ page }) => {
    await page.goto('/admin/login');
    await page.locator('[data-testid="password-input"]').fill(ADMIN_PASSWORD);
    await page.locator('[data-testid="login-submit"]').click();
    await expect(page).toHaveURL(/\/admin\/treatments/);

    await page.evaluate(() => localStorage.removeItem('einat_token'));
    await page.goto('/admin/treatments');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('AUTH-N1: Empty password → validation error, no redirect', async ({ page }) => {
    await page.goto('/admin/login');
    await page.locator('[data-testid="login-submit"]').click();
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('AUTH-N2: Wrong password → 401 error message shown', async ({ page }) => {
    await page.goto('/admin/login');
    await page.locator('[data-testid="password-input"]').fill('completely-wrong-password-xyz-99');
    await page.locator('[data-testid="login-submit"]').click();
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('AUTH-N3: Navigate to /admin/treatments without token → redirect to /admin/login', async ({ page }) => {
    await page.goto('/admin/treatments');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('AUTH-N4: Tampered JWT → 401 on API call → redirect to /admin/login', async ({ page }) => {
    // Seed a tampered token without going through login
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('einat_token', 'tampered.invalid.token.value');
    });
    await page.goto('/admin/treatments');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('AUTH-E1: Whitespace-only password → treated as empty, rejected', async ({ page }) => {
    await page.goto('/admin/login');
    await page.locator('[data-testid="password-input"]').fill('   ');
    await page.locator('[data-testid="login-submit"]').click();
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('AUTH-E2: Very long password (500 chars) → graceful error', async ({ page }) => {
    await page.goto('/admin/login');
    await page.locator('[data-testid="password-input"]').fill('a'.repeat(500));
    await page.locator('[data-testid="login-submit"]').click();
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
