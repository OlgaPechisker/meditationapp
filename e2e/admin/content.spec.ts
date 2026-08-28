import { adminTest, expect } from '../fixtures/auth.fixture';
import { getAdminToken, upsertContent } from '../fixtures/factory';

adminTest.describe('Admin Content', () => {
  let token = '';

  adminTest.beforeEach(async ({ request }) => {
    token = await getAdminToken();
  });

  adminTest('ACNT-P1: /admin/content shows About and Contact sections pre-populated', async ({
    page,
  }) => {
    await page.goto('/admin/content');

    await expect(page.locator('[data-testid="about-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="contact-section"]')).toBeVisible();

    // Fields are pre-populated (not empty) from seed data
    await expect(page.locator('[data-testid="field-about-title"]')).not.toHaveValue('');
    await expect(page.locator('[data-testid="field-contact-phone"]')).not.toHaveValue('');
    await expect(page.locator('[data-testid="field-contact-email"]')).not.toHaveValue('');
  });

  adminTest('ACNT-P2: Editing about title saves and persists on reload', async ({
    page,
    request,
  }) => {
    const newTitle = `כותרת בדיקה ${Date.now()}`;

    await page.goto('/admin/content');
    await expect(page.locator('[data-testid="about-section"]')).toBeVisible();

    await page.locator('[data-testid="field-about-title"]').fill(newTitle);
    await page.locator('[data-testid="save-about"]').click();
    await expect(page.locator('[data-testid="about-success"]')).toBeVisible();

    // Reload and verify the value persisted
    await page.goto('/admin/content');
    await expect(page.locator('[data-testid="field-about-title"]')).toHaveValue(newTitle);

    // Restore original value
    await upsertContent(request, token, 'about_title', 'אודות');
  });

  adminTest('ACNT-P3: Editing contact phone saves and persists on reload', async ({
    page,
    request,
  }) => {
    const newPhone = `050-${Date.now().toString().slice(-7)}`;

    await page.goto('/admin/content');
    await expect(page.locator('[data-testid="contact-section"]')).toBeVisible();

    await page.locator('[data-testid="field-contact-phone"]').fill(newPhone);
    await page.locator('[data-testid="save-contact"]').click();
    await expect(page.locator('[data-testid="contact-success"]')).toBeVisible();

    // Reload and verify the value persisted
    await page.goto('/admin/content');
    await expect(page.locator('[data-testid="field-contact-phone"]')).toHaveValue(newPhone);

    // Restore original value
    await upsertContent(request, token, 'contact_phone', '+972501234567');
  });

  adminTest('ACNT-N1: Saving about section with empty title → validation prevents save', async ({
    page,
  }) => {
    await page.goto('/admin/content');
    await expect(page.locator('[data-testid="about-section"]')).toBeVisible();

    await page.locator('[data-testid="field-about-title"]').fill('');
    await page.locator('[data-testid="save-about"]').click();

    // Success indicator must NOT appear — form is invalid
    await expect(page.locator('[data-testid="about-success"]')).not.toBeVisible();
  });
});
