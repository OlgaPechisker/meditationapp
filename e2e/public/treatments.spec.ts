import { test, expect } from '@playwright/test';
import { getAdminToken, createTreatment, deleteTreatment, updateTreatment } from '../fixtures/factory';

test.describe('Public Treatments', () => {
  let token = '';
  let treatment: { id: number; slug: string; title: string };
  const extraIds: number[] = [];

  test.beforeEach(async ({ request }) => {
    token = await getAdminToken(request);
    extraIds.length = 0;
    treatment = await createTreatment(request, token, {
      title: 'E2E Active Treatment',
      description: 'A detailed description of this treatment for testing.',
      price: '150',
      locale: 'he',
    });
  });

  test.afterEach(async ({ request }) => {
    for (const id of extraIds) {
      await deleteTreatment(request, token, id).catch(() => {});
    }
    if (treatment?.id) {
      await deleteTreatment(request, token, treatment.id).catch(() => {});
    }
  });

  test('TRT-P1: /treatments renders list of active treatments', async ({ page }) => {
    await page.goto('/treatments');
    await expect(
      page.locator(`[data-testid="treatment-card"][data-slug="${treatment.slug}"]`),
    ).toBeVisible();
  });

  test('TRT-P2: Click treatment card → /treatments/:slug shows title & description', async ({
    page,
  }) => {
    await page.goto('/treatments');
    await page
      .locator(`[data-testid="treatment-card"][data-slug="${treatment.slug}"]`)
      .click();
    await expect(page).toHaveURL(new RegExp(`/treatments/${treatment.slug}`));
    await expect(page.locator('[data-testid="treatment-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="treatment-description"]')).toBeVisible();
  });

  test('TRT-P3: Locale switch — /treatments?locale=en shows English treatments', async ({
    page,
    request,
  }) => {
    const enTreatment = await createTreatment(request, token, {
      title: 'English Treatment',
      description: 'English description',
      locale: 'en',
    });
    extraIds.push(enTreatment.id);

    await page.goto('/treatments?locale=en');
    await expect(
      page.locator(`[data-testid="treatment-card"][data-slug="${enTreatment.slug}"]`),
    ).toBeVisible();
  });

  test('TRT-N1: Navigate to non-existent slug → 404 UI shown', async ({ page }) => {
    await page.goto('/treatments/non-existent-slug-xyz-12345');
    await expect(page.locator('[data-testid="treatment-not-found"]')).toBeVisible();
  });

  test('TRT-N2: Inactive treatment is NOT visible in public list', async ({ page, request }) => {
    const inactiveTreatment = await createTreatment(request, token, {
      title: 'Inactive Treatment',
      isActive: false,
    });
    extraIds.push(inactiveTreatment.id);

    await page.goto('/treatments');
    // Wait for page to load — active treatment from beforeEach must be visible
    await expect(
      page.locator(`[data-testid="treatment-card"][data-slug="${treatment.slug}"]`),
    ).toBeVisible();
    // Inactive treatment must not appear
    await expect(
      page.locator(`[data-testid="treatment-card"][data-slug="${inactiveTreatment.slug}"]`),
    ).not.toBeVisible();
  });

  test('TRT-E1: Treatment with no optional fields (no price, no image) still renders', async ({
    page,
    request,
  }) => {
    const minimalTreatment = await createTreatment(request, token, {
      title: 'Minimal Treatment',
      description: 'Only title and description provided.',
      // no price, no imageUrl
    });
    extraIds.push(minimalTreatment.id);

    await page.goto('/treatments');
    await expect(
      page.locator(`[data-testid="treatment-card"][data-slug="${minimalTreatment.slug}"]`),
    ).toBeVisible();

    await page
      .locator(`[data-testid="treatment-card"][data-slug="${minimalTreatment.slug}"]`)
      .click();
    await expect(page.locator('[data-testid="treatment-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="treatment-description"]')).toBeVisible();
  });
});
