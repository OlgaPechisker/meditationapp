import { adminTest, expect } from '../fixtures/auth.fixture';
import { getAdminToken, createLecture } from '../fixtures/factory';

adminTest.describe('Admin Lectures', () => {
  let token = '';

  adminTest.beforeEach(async ({ request }) => {
    token = await getAdminToken(request);
  });

  // No DELETE endpoint for lectures — each test uses unique timestamps in slugs

  adminTest('ALEC-P1: /admin/lectures lists all lectures', async ({ page, request }) => {
    const lecture = await createLecture(request, token, {
      title: 'ALEC-P1 Lecture',
    });

    await page.goto('/admin/lectures');

    await expect(
      page.locator(`[data-testid="lecture-row"][data-id="${lecture.id}"]`),
    ).toBeVisible();
  });

  adminTest('ALEC-P2: Create lecture with required fields → appears in list', async ({
    page,
  }) => {
    const slug = `alec-p2-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);
    const dateValue = futureDate.toISOString().slice(0, 16); // datetime-local format

    await page.goto('/admin/lectures');

    await adminTest.step('open form', async () => {
      await page.locator('[data-testid="add-lecture-btn"]').click();
      await expect(page.locator('[data-testid="lecture-form"]')).toBeVisible();
    });

    await page.locator('[data-testid="field-title"]').fill('ALEC-P2 New Lecture');
    await page.locator('[data-testid="field-description"]').fill('Description for ALEC-P2 lecture.');
    await page.locator('[data-testid="field-date"]').fill(dateValue);
    await page.locator('[data-testid="field-location"]').fill('Test Hall ALEC-P2');
    await page.locator('[data-testid="field-price"]').fill('100');
    await page.locator('[data-testid="form-save"]').click();

    // The new lecture row should be visible (identified by title text since no slug on row)
    await expect(
      page.locator('[data-testid="lectures-table"]')
        .locator('[data-testid="lecture-title"]', { hasText: 'ALEC-P2 New Lecture' })
        .first(),
    ).toBeVisible();
  });

  adminTest('ALEC-P3: Set future date → lecture visible in public /lectures', async ({
    page,
    request,
  }) => {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 2);

    const lecture = await createLecture(request, token, {
      title: 'ALEC-P3 Future Lecture',
      date: futureDate.toISOString(),
      isActive: true,
    });

    await page.goto('/lectures');

    await expect(
      page.locator('[data-testid="upcoming-section"]')
        .locator(`[data-testid="lecture-card"][data-id="${lecture.id}"]`),
    ).toBeVisible();
  });

  adminTest(
    'ALEC-P4: Set past date → lecture NOT shown on public /lectures upcoming section',
    async ({ page, request }) => {
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 2);

      // Also create a future lecture as anchor to confirm page loaded
      const futureLecture = await createLecture(request, token, {
        title: 'ALEC-P4 Anchor Future Lecture',
      });

      const pastLecture = await createLecture(request, token, {
        title: 'ALEC-P4 Past Lecture',
        date: pastDate.toISOString(),
      });

      await page.goto('/lectures');

      // Wait for page to load — future anchor lecture must be visible
      await expect(
        page.locator('[data-testid="upcoming-section"]')
          .locator(`[data-testid="lecture-card"][data-id="${futureLecture.id}"]`),
      ).toBeVisible();

      // Past lecture must NOT be in upcoming section
      await expect(
        page.locator('[data-testid="upcoming-section"]')
          .locator(`[data-testid="lecture-card"][data-id="${pastLecture.id}"]`),
      ).not.toBeVisible();
    },
  );

  adminTest('ALEC-P5: Update lecture → public page reflects change', async ({
    page,
    request,
  }) => {
    const lecture = await createLecture(request, token, {
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

    // Verify updated in admin list
    await expect(
      page
        .locator(`[data-testid="lecture-row"][data-id="${lecture.id}"]`)
        .locator('[data-testid="lecture-title"]'),
    ).toContainText(newTitle);

    // Verify reflected on public /lectures page
    await page.goto('/lectures');
    await expect(
      page.locator(`[data-testid="lecture-card"][data-id="${lecture.id}"]`)
        .locator('[data-testid="lecture-card-title"]'),
    ).toContainText(newTitle);
  });

  adminTest('ALEC-N1: Create lecture with no date → validation error shown', async ({ page }) => {
    await page.goto('/admin/lectures');

    await adminTest.step('open form', async () => {
      await page.locator('[data-testid="add-lecture-btn"]').click();
      await expect(page.locator('[data-testid="lecture-form"]')).toBeVisible();
    });

    await page.locator('[data-testid="field-title"]').fill('Lecture Without Date');
    await page.locator('[data-testid="field-location"]').fill('Some Location');
    // Leave date empty
    await page.locator('[data-testid="form-save"]').click();

    await expect(page.locator('[data-testid="form-error"]')).toBeVisible();
  });

  adminTest('ALEC-N2: imageUrl that is not valid URL → validation error', async ({ page }) => {
    await page.goto('/admin/lectures');

    await adminTest.step('open form', async () => {
      await page.locator('[data-testid="add-lecture-btn"]').click();
      await expect(page.locator('[data-testid="lecture-form"]')).toBeVisible();
    });

    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);

    await page.locator('[data-testid="field-title"]').fill('Lecture With Bad Image URL');
    await page.locator('[data-testid="field-date"]').fill(futureDate.toISOString().slice(0, 16));
    await page.locator('[data-testid="field-imageUrl"]').fill('not-a-valid-url');
    await page.locator('[data-testid="form-save"]').click();

    await expect(page.locator('[data-testid="form-error"]')).toBeVisible();
  });
});
