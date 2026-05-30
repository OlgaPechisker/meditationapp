import { test, expect } from '@playwright/test';
import { getAdminToken, createLecture, deleteLecture } from '../fixtures/factory';

test.describe('Public Lectures', () => {
  let token = '';
  let upcomingLecture: { id: number; slug: string; title: string };
  const extraIds: number[] = [];

  test.beforeEach(async ({ request }) => {
    token = await getAdminToken(request);
    extraIds.length = 0;

    // Create an upcoming (future-dated) lecture as the default test fixture
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);

    upcomingLecture = await createLecture(request, token, {
      title: 'E2E Upcoming Lecture',
      description: 'An upcoming lecture for e2e testing.',
      date: futureDate.toISOString(),
      location: 'Test Hall A',
      price: '120',
      locale: 'he',
    });
  });

  test.afterEach(async ({ request }) => {
    for (const id of extraIds) {
      await deleteLecture(request, token, id).catch(() => {});
    }
    if (upcomingLecture?.id) {
      await deleteLecture(request, token, upcomingLecture.id).catch(() => {});
    }
  });

  test('LEC-P1: /lectures shows upcoming active lectures in upcoming-section', async ({
    page,
  }) => {
    await page.goto('/lectures');
    await expect(page.locator('[data-testid="upcoming-section"]')).toBeVisible();
    await expect(
      page
        .locator('[data-testid="upcoming-section"]')
        .locator(`[data-testid="lecture-card"][data-id="${upcomingLecture.id}"]`),
    ).toBeVisible();
  });

  test('LEC-P2: Lecture cards show title, date, location, and price', async ({ page }) => {
    await page.goto('/lectures');

    const card = page
      .locator('[data-testid="upcoming-section"]')
      .locator(`[data-testid="lecture-card"][data-id="${upcomingLecture.id}"]`);

    await expect(card).toBeVisible();
    await expect(card.locator('[data-testid="lecture-card-title"]')).toBeVisible();
    await expect(card.locator('[data-testid="lecture-card-date"]')).toBeVisible();
    await expect(card.locator('[data-testid="lecture-card-location"]')).toBeVisible();
    await expect(card.locator('[data-testid="lecture-card-price"]')).toBeVisible();
  });

  test('LEC-N1: Past-dated lecture is NOT shown in upcoming-section', async ({
    page,
    request,
  }) => {
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - 1);

    const pastLecture = await createLecture(request, token, {
      title: 'E2E Past Lecture',
      date: pastDate.toISOString(),
    });
    extraIds.push(pastLecture.id);

    await page.goto('/lectures');
    // Wait for page load — upcoming lecture must be visible
    await expect(
      page
        .locator('[data-testid="upcoming-section"]')
        .locator(`[data-testid="lecture-card"][data-id="${upcomingLecture.id}"]`),
    ).toBeVisible();

    // Past lecture must NOT be in the upcoming section
    await expect(
      page
        .locator('[data-testid="upcoming-section"]')
        .locator(`[data-testid="lecture-card"][data-id="${pastLecture.id}"]`),
    ).not.toBeVisible();
  });

  test('LEC-E1: Lecture with date in far past is NOT shown in upcoming-section', async ({
    page,
    request,
  }) => {
    const farPastDate = new Date('2020-01-01T00:00:00.000Z');

    const oldLecture = await createLecture(request, token, {
      title: 'E2E Far Past Lecture',
      date: farPastDate.toISOString(),
    });
    extraIds.push(oldLecture.id);

    await page.goto('/lectures');
    await expect(
      page
        .locator('[data-testid="upcoming-section"]')
        .locator(`[data-testid="lecture-card"][data-id="${upcomingLecture.id}"]`),
    ).toBeVisible();

    await expect(
      page
        .locator('[data-testid="upcoming-section"]')
        .locator(`[data-testid="lecture-card"][data-id="${oldLecture.id}"]`),
    ).not.toBeVisible();
  });

  test('LEC-E2: Lecture with date in far future is shown as upcoming', async ({
    page,
    request,
  }) => {
    const farFutureDate = new Date('2099-12-31T00:00:00.000Z');

    const futureLecture = await createLecture(request, token, {
      title: 'E2E Far Future Lecture',
      date: farFutureDate.toISOString(),
    });
    extraIds.push(futureLecture.id);

    await page.goto('/lectures');
    await expect(
      page
        .locator('[data-testid="upcoming-section"]')
        .locator(`[data-testid="lecture-card"][data-id="${futureLecture.id}"]`),
    ).toBeVisible();
  });
});
