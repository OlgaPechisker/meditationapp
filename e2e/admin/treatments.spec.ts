import { adminTest, expect } from '../fixtures/auth.fixture';
import { getAdminToken, createTreatment } from '../fixtures/factory';

adminTest.describe('Admin Treatments', () => {
  let token = '';

  adminTest.beforeEach(async ({ request }) => {
    token = await getAdminToken(request);
  });

  // No DELETE endpoint for treatments — each test uses unique timestamps in slugs

  adminTest('ATRT-P1: /admin/treatments lists all treatments including inactive', async ({
    page,
    request,
  }) => {
    const active = await createTreatment(request, token, { isActive: true });
    const inactive = await createTreatment(request, token, { isActive: false });

    await page.goto('/admin/treatments');

    await expect(
      page.locator(`[data-testid="treatment-row"][data-slug="${active.slug}"]`),
    ).toBeVisible();
    await expect(
      page.locator(`[data-testid="treatment-row"][data-slug="${inactive.slug}"]`),
    ).toBeVisible();
  });

  adminTest('ATRT-P2: Create new treatment → appears in list', async ({ page }) => {
    const slug = `atrt-p2-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    await page.goto('/admin/treatments');

    await adminTest.step('open form', async () => {
      await page.locator('[data-testid="add-treatment-btn"]').click();
      await expect(page.locator('[data-testid="treatment-form"]')).toBeVisible();
    });

    await page.locator('[data-testid="field-slug"]').fill(slug);
    await page.locator('[data-testid="field-title"]').fill('ATRT-P2 Treatment');
    await page.locator('[data-testid="field-description"]').fill('Description for ATRT-P2 test.');
    await page.locator('[data-testid="form-save"]').click();

    await expect(
      page.locator(`[data-testid="treatment-row"][data-slug="${slug}"]`),
    ).toBeVisible();
  });

  adminTest('ATRT-P3: Edit treatment title → change reflected in list and public page', async ({
    page,
    request,
  }) => {
    const treatment = await createTreatment(request, token, {
      title: 'ATRT-P3 Original Title',
      isActive: true,
    });
    const newTitle = `ATRT-P3 Updated ${Date.now()}`;

    await page.goto('/admin/treatments');

    const row = page.locator(`[data-testid="treatment-row"][data-slug="${treatment.slug}"]`);
    await expect(row).toBeVisible();
    await row.locator('[data-testid="treatment-edit-btn"]').click();
    await expect(page.locator('[data-testid="treatment-form"]')).toBeVisible();

    await page.locator('[data-testid="field-title"]').fill(newTitle);
    await page.locator('[data-testid="form-save"]').click();

    await expect(
      page
        .locator(`[data-testid="treatment-row"][data-slug="${treatment.slug}"]`)
        .locator('[data-testid="treatment-title"]'),
    ).toContainText(newTitle);

    // Verify reflected on public page
    await page.goto(`/treatments/${treatment.slug}`);
    await expect(page.locator('[data-testid="treatment-title"]')).toContainText(newTitle);
  });

  adminTest('ATRT-P4: Toggle isActive off → treatment disappears from public list', async ({
    page,
    request,
  }) => {
    const treatment = await createTreatment(request, token, { isActive: true });

    await page.goto('/admin/treatments');

    const row = page.locator(`[data-testid="treatment-row"][data-slug="${treatment.slug}"]`);
    await expect(row).toBeVisible();
    await row.locator('[data-testid="treatment-edit-btn"]').click();
    await expect(page.locator('[data-testid="treatment-form"]')).toBeVisible();

    const checkbox = page.locator('[data-testid="field-isActive"]');
    if (await checkbox.isChecked()) {
      await checkbox.uncheck();
    }
    await page.locator('[data-testid="form-save"]').click();

    // Wait for the row to reflect the save
    await expect(
      page.locator(`[data-testid="treatment-row"][data-slug="${treatment.slug}"]`),
    ).toBeVisible();

    // Verify treatment is NOT visible on the public page
    await page.goto('/treatments');
    await expect(
      page.locator(`[data-testid="treatment-card"][data-slug="${treatment.slug}"]`),
    ).not.toBeVisible();
  });

  adminTest('ATRT-P5: Fill all optional fields → saved correctly', async ({ page }) => {
    const slug = `atrt-p5-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    await page.goto('/admin/treatments');

    await adminTest.step('open form', async () => {
      await page.locator('[data-testid="add-treatment-btn"]').click();
      await expect(page.locator('[data-testid="treatment-form"]')).toBeVisible();
    });

    await page.locator('[data-testid="field-slug"]').fill(slug);
    await page.locator('[data-testid="field-title"]').fill('ATRT-P5 All Fields');
    await page.locator('[data-testid="field-description"]').fill('Full optional fields description.');
    await page.locator('[data-testid="field-price"]').fill('250');
    await page.locator('[data-testid="field-imageUrl"]').fill('https://example.com/treatment.jpg');
    await page.locator('[data-testid="field-sortOrder"]').fill('3');
    await page.locator('[data-testid="form-save"]').click();

    await expect(
      page.locator(`[data-testid="treatment-row"][data-slug="${slug}"]`),
    ).toBeVisible();
  });

  adminTest('ATRT-N1: Create treatment with empty slug → validation error shown', async ({
    page,
  }) => {
    await page.goto('/admin/treatments');

    await adminTest.step('open form', async () => {
      await page.locator('[data-testid="add-treatment-btn"]').click();
      await expect(page.locator('[data-testid="treatment-form"]')).toBeVisible();
    });

    // Leave slug empty, fill only title
    await page.locator('[data-testid="field-title"]').fill('Title Without Slug');
    await page.locator('[data-testid="form-save"]').click();

    await expect(page.locator('[data-testid="form-error"]')).toBeVisible();
  });

  adminTest(
    'ATRT-N2: Create treatment with duplicate slug+locale → server 4xx, form-error shown',
    async ({ page, request }) => {
      const existing = await createTreatment(request, token, { locale: 'he' });

      await page.goto('/admin/treatments');

      await adminTest.step('open form', async () => {
        await page.locator('[data-testid="add-treatment-btn"]').click();
        await expect(page.locator('[data-testid="treatment-form"]')).toBeVisible();
      });

      // Use same slug + default locale (he) to trigger duplicate error
      await page.locator('[data-testid="field-slug"]').fill(existing.slug);
      await page.locator('[data-testid="field-title"]').fill('Duplicate Treatment');
      await page.locator('[data-testid="form-save"]').click();

      await expect(page.locator('[data-testid="form-error"]')).toBeVisible();
    },
  );

  adminTest('ATRT-N3: imageUrl that is not a valid URL → validation error', async ({ page }) => {
    await page.goto('/admin/treatments');

    await adminTest.step('open form', async () => {
      await page.locator('[data-testid="add-treatment-btn"]').click();
      await expect(page.locator('[data-testid="treatment-form"]')).toBeVisible();
    });

    const slug = `atrt-n3-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await page.locator('[data-testid="field-slug"]').fill(slug);
    await page.locator('[data-testid="field-title"]').fill('Treatment With Bad URL');
    await page.locator('[data-testid="field-imageUrl"]').fill('not-a-valid-url');
    await page.locator('[data-testid="form-save"]').click();

    await expect(page.locator('[data-testid="form-error"]')).toBeVisible();
  });
});
