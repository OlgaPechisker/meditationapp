import { adminTest, expect } from '../fixtures/auth.fixture';
import { getAdminToken, createLecture } from '../fixtures/factory';
import type { Page } from '@playwright/test';

/** Fills the fields shared by every lecture type (leaves type-specific fields to the caller). */
async function fillSharedFields(page: Page, title: string) {
  await page.locator('[data-testid="field-title"]').fill(title);
  await page.locator('[data-testid="field-subtitle"]').fill('Subtitle text');
  await page.locator('[data-testid="field-durationLabel"]').fill('90 minutes');
  await page.locator('[data-testid="field-summary"]').fill('A short summary for the lecture.');
  await page.locator('[data-testid="field-description"] .ql-editor').fill('Full description body for the lecture.');
  await page.locator('[data-testid="field-audience"]').fill('Anyone interested');
  await page.locator('[data-testid="field-highlight-0"]').fill('First highlight');
  await page.locator('[data-testid="field-location"]').fill('Test Hall');
}

adminTest.describe('Admin Lectures', () => {
  let token = '';

  adminTest.beforeEach(async ({ request }) => {
    token = await getAdminToken(request);
  });

  adminTest('ALEC-P1: /admin/lectures lists all lectures', async ({ page, request }) => {
    const lecture = await createLecture(request, token, { title: 'ALEC-P1 Lecture' });

    await page.goto('/admin/lectures');

    await expect(
      page.locator(`[data-testid="lecture-row"][data-id="${lecture.id}"]`),
    ).toBeVisible();
  });

  adminTest('ALEC-P2: Create a scheduled lecture → appears in list', async ({ page }) => {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);
    const dateValue = futureDate.toISOString().slice(0, 16); // datetime-local format

    await page.goto('/admin/lectures');

    await adminTest.step('open form', async () => {
      await page.locator('[data-testid="add-lecture-btn"]').click();
      await expect(page.locator('[data-testid="lecture-form"]')).toBeVisible();
    });

    await fillSharedFields(page, 'ALEC-P2 New Lecture');
    await page.locator('[data-testid="field-date"]').fill(dateValue);
    await page.locator('[data-testid="field-price"]').fill('100');
    await page.locator('[data-testid="form-save"]').click();

    await expect(
      page.locator('[data-testid="lectures-table"]')
        .locator('[data-testid="lecture-title"]', { hasText: 'ALEC-P2 New Lecture' })
        .first(),
    ).toBeVisible();
  });

  adminTest('ALEC-P2b: Create an on-demand lecture with a minimum and no date', async ({ page }) => {
    await page.goto('/admin/lectures');

    await adminTest.step('open form', async () => {
      await page.locator('[data-testid="add-lecture-btn"]').click();
      await expect(page.locator('[data-testid="lecture-form"]')).toBeVisible();
    });

    await page.locator('[data-testid="field-type"]').selectOption('ON_DEMAND');
    // The date field is replaced by a minimum-participants field for on-demand lectures.
    await expect(page.locator('[data-testid="field-date"]')).toHaveCount(0);
    await fillSharedFields(page, 'ALEC-P2b On-Demand Lecture');
    await page.locator('[data-testid="field-minimumParticipants"]').fill('10');
    // Price intentionally left empty (allowed for on-demand).
    await page.locator('[data-testid="form-save"]').click();

    const row = page
      .locator('[data-testid="lecture-row"]')
      .filter({ has: page.locator('[data-testid="lecture-title"]', { hasText: 'ALEC-P2b On-Demand Lecture' }) })
      .first();
    await expect(row).toBeVisible();
    await expect(row).toHaveAttribute('data-type', 'ON_DEMAND');
    await expect(row.locator('[data-testid="lecture-min"]')).toContainText('10');
    await expect(row.locator('[data-testid="lecture-public"]')).toContainText('מוצג');
  });

  adminTest('ALEC-P3: Set future date → lecture visible in public /lectures', async ({
    page,
    request,
  }) => {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 2);

    const lecture = await createLecture(request, token, {
      type: 'SCHEDULED',
      title: 'ALEC-P3 Future Lecture',
      date: futureDate.toISOString(),
      isActive: true,
    });

    await page.goto('/lectures');

    await expect(
      page.locator(`[data-testid="lecture-card"][data-id="${lecture.id}"]`),
    ).toBeVisible();
  });

  adminTest('ALEC-P4: Set past date → lecture NOT shown on public /lectures', async ({
    page,
    request,
  }) => {
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - 2);

    // Future anchor lecture to confirm the page loaded.
    const futureLecture = await createLecture(request, token, {
      type: 'SCHEDULED',
      title: 'ALEC-P4 Anchor Future Lecture',
    });

    const pastLecture = await createLecture(request, token, {
      type: 'SCHEDULED',
      title: 'ALEC-P4 Past Lecture',
      date: pastDate.toISOString(),
    });

    await page.goto('/lectures');

    await expect(
      page.locator(`[data-testid="lecture-card"][data-id="${futureLecture.id}"]`),
    ).toBeVisible();

    await expect(
      page.locator(`[data-testid="lecture-card"][data-id="${pastLecture.id}"]`),
    ).toHaveCount(0);
  });

  adminTest('ALEC-P5: Update lecture → public page reflects change', async ({ page, request }) => {
    const lecture = await createLecture(request, token, {
      type: 'SCHEDULED',
      title: 'ALEC-P5 Original Title',
    });
    const newTitle = `ALEC-P5 Updated ${Date.now()}`;

    await page.goto('/admin/lectures');

    const row = page.locator(`[data-testid="lecture-row"][data-id="${lecture.id}"]`);
    await expect(row).toBeVisible();
    await row.locator('[data-testid="lecture-edit-btn"]').click();
    await expect(page.locator('[data-testid="lecture-form"]')).toBeVisible();

    await page.locator('[data-testid="field-title"]').fill(newTitle);
    await page.locator('[data-testid="form-save"]').click();

    await expect(
      page
        .locator(`[data-testid="lecture-row"][data-id="${lecture.id}"]`)
        .locator('[data-testid="lecture-title"]'),
    ).toContainText(newTitle);

    await page.goto('/lectures');
    await expect(
      page.locator(`[data-testid="lecture-card"][data-id="${lecture.id}"]`)
        .locator('[data-testid="lecture-card-title"]'),
    ).toContainText(newTitle);
  });

  adminTest('ALEC-N1: Scheduled lecture with no date → validation error shown', async ({ page }) => {
    await page.goto('/admin/lectures');

    await adminTest.step('open form', async () => {
      await page.locator('[data-testid="add-lecture-btn"]').click();
      await expect(page.locator('[data-testid="lecture-form"]')).toBeVisible();
    });

    // Fill every required field except the (scheduled-only) date.
    await fillSharedFields(page, 'Scheduled Without Date');
    await page.locator('[data-testid="field-price"]').fill('100');
    // Leave the date empty.
    await page.locator('[data-testid="form-save"]').click();

    await expect(page.locator('[data-testid="form-error"]')).toBeVisible();
  });

  adminTest('ALEC-N1b: On-demand lecture with no minimum → validation error shown', async ({
    page,
  }) => {
    await page.goto('/admin/lectures');

    await adminTest.step('open form', async () => {
      await page.locator('[data-testid="add-lecture-btn"]').click();
      await expect(page.locator('[data-testid="lecture-form"]')).toBeVisible();
    });

    await page.locator('[data-testid="field-type"]').selectOption('ON_DEMAND');
    await fillSharedFields(page, 'On-Demand Without Minimum');
    // Leave minimumParticipants empty.
    await page.locator('[data-testid="form-save"]').click();

    await expect(page.locator('[data-testid="form-error"]')).toBeVisible();
  });

  adminTest('ALEC-N2: image upload rejects a non-image file', async ({ page }) => {
    await page.goto('/admin/lectures');

    await adminTest.step('open form', async () => {
      await page.locator('[data-testid="add-lecture-btn"]').click();
      await expect(page.locator('[data-testid="lecture-form"]')).toBeVisible();
    });

    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes('/api/upload') &&
          response.request().method() === 'POST' &&
          !response.ok(),
      ),
      page.locator('[data-testid="field-imageUrl"] input[type="file"]').setInputFiles({
        name: 'not-an-image.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('not an image'),
      }),
    ]);

    await expect(page.locator('[data-testid="field-imageUrl"] .upload-error')).toBeVisible();
  });

  adminTest('ALEC-D1: Delete lecture → removed from list', async ({ page, request }) => {
    const lecture = await createLecture(request, token, { title: 'ALEC-D1 To Delete' });

    await page.goto('/admin/lectures');
    const row = page.locator(`[data-testid="lecture-row"][data-id="${lecture.id}"]`);
    await expect(row).toBeVisible();

    await row.locator('[data-testid="lecture-delete-btn"]').click();

    await expect(
      page.locator(`[data-testid="lecture-row"][data-id="${lecture.id}"]`),
    ).toHaveCount(0);
  });
});
