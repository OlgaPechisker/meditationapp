import { adminTest, expect } from '../fixtures/auth.fixture';
import { getAdminToken, upsertContent } from '../fixtures/factory';

adminTest.describe('Admin Content', () => {
  let token = '';
  const keysToCleanup: Array<{ key: string; locale: string }> = [];

  adminTest.beforeEach(async ({ request }) => {
    token = await getAdminToken(request);
    keysToCleanup.length = 0;
  });

  adminTest.afterEach(async ({ request }) => {
    // Clean up by setting test keys to an empty string value
    for (const { key, locale } of keysToCleanup) {
      await upsertContent(request, token, key, '', locale).catch(() => {});
    }
  });

  adminTest('ACNT-P1: /admin/content lists content keys', async ({ page, request }) => {
    const key = `acnt_p1_key_${Date.now()}`;
    const value = 'ACNT-P1 test value';
    await upsertContent(request, token, key, value);
    keysToCleanup.push({ key, locale: 'he' });

    await page.goto('/admin/content');

    await expect(
      page.locator(`[data-testid="content-row"][data-key="${key}"]`),
    ).toBeVisible();
    await expect(
      page
        .locator(`[data-testid="content-row"][data-key="${key}"]`)
        .locator('[data-testid="content-key"]'),
    ).toContainText(key);
  });

  adminTest(
    'ACNT-P2: Update a content value → new value saved (verified via edit form reopen)',
    async ({ page, request }) => {
      const key = `acnt_p2_key_${Date.now()}`;
      await upsertContent(request, token, key, 'initial value');
      keysToCleanup.push({ key, locale: 'he' });

      const newValue = `ACNT-P2 updated value ${Date.now()}`;

      await page.goto('/admin/content');

      const row = page.locator(`[data-testid="content-row"][data-key="${key}"]`);
      await expect(row).toBeVisible();
      await row.locator('[data-testid="content-edit-btn"]').click();
      await expect(page.locator('[data-testid="content-form"]')).toBeVisible();

      await page.locator('[data-testid="field-value"]').fill(newValue);
      await page.locator('[data-testid="form-save"]').click();

      // Row still visible after save (success)
      await expect(
        page.locator(`[data-testid="content-row"][data-key="${key}"]`),
      ).toBeVisible();

      // Reopen edit form and verify the new value was persisted
      await page
        .locator(`[data-testid="content-row"][data-key="${key}"]`)
        .locator('[data-testid="content-edit-btn"]')
        .click();
      await expect(page.locator('[data-testid="content-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="field-value"]')).toHaveValue(newValue);

      // Close form
      await page.locator('[data-testid="form-cancel"]').click();
    },
  );

  adminTest(
    'ACNT-P3: Upsert creates new key if it does not exist → appears in table',
    async ({ page }) => {
      const uniqueKey = `acnt_p3_test_key_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      keysToCleanup.push({ key: uniqueKey, locale: 'he' });

      await page.goto('/admin/content');

      await adminTest.step('open form', async () => {
        await page.locator('[data-testid="add-content-btn"]').click();
        await expect(page.locator('[data-testid="content-form"]')).toBeVisible();
      });

      await page.locator('[data-testid="field-key"]').fill(uniqueKey);
      await page.locator('[data-testid="field-value"]').fill('ACNT-P3 new content value');
      await page.locator('[data-testid="form-save"]').click();

      await expect(
        page.locator(`[data-testid="content-row"][data-key="${uniqueKey}"]`),
      ).toBeVisible();
    },
  );

  adminTest('ACNT-N1: Update content with empty value → validation error', async ({
    page,
    request,
  }) => {
    const key = `acnt_n1_key_${Date.now()}`;
    await upsertContent(request, token, key, 'some value');
    keysToCleanup.push({ key, locale: 'he' });

    await page.goto('/admin/content');

    const row = page.locator(`[data-testid="content-row"][data-key="${key}"]`);
    await expect(row).toBeVisible();
    await row.locator('[data-testid="content-edit-btn"]').click();
    await expect(page.locator('[data-testid="content-form"]')).toBeVisible();

    // Clear the value field
    await page.locator('[data-testid="field-value"]').fill('');
    await page.locator('[data-testid="form-save"]').click();

    await expect(page.locator('[data-testid="form-error"]')).toBeVisible();
  });
});
