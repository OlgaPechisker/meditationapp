import { test, expect } from '@playwright/test';
import { getAdminToken, createLecture, deleteLecture } from '../fixtures/factory';

test.describe('Public Lectures', () => {
  let token = '';
  let upcomingLecture: { id: number; slug: string; title: string };
  const extraIds: number[] = [];

  const cardById = (page: import('@playwright/test').Page, id: number) =>
    page.locator(`[data-testid="lecture-card"][data-id="${id}"]`);

  test.beforeEach(async ({ request }) => {
    token = await getAdminToken();
    extraIds.length = 0;

    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);

    // Default fixture: an upcoming SCHEDULED lecture.
    upcomingLecture = await createLecture(request, token, {
      type: 'SCHEDULED',
      title: 'E2E Upcoming Lecture',
      date: futureDate.toISOString(),
      location: 'Test Hall A',
      price: 120,
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

  test('LEC-P1: /lectures shows an upcoming scheduled lecture card', async ({ page }) => {
    await page.goto('/lectures');
    const card = cardById(page, upcomingLecture.id);
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute('data-type', 'SCHEDULED');
  });

  test('LEC-P2: Scheduled card shows title, date, location, and price', async ({ page }) => {
    await page.goto('/lectures');
    const card = cardById(page, upcomingLecture.id);

    await expect(card).toBeVisible();
    await expect(card.locator('[data-testid="lecture-card-title"]')).toBeVisible();
    await expect(card.locator('[data-testid="lecture-card-date"]')).toBeVisible();
    await expect(card.locator('[data-testid="lecture-card-location"]')).toBeVisible();
    await expect(card.locator('[data-testid="lecture-card-price"]')).toContainText('₪');
  });

  test('LEC-P3: On-demand lecture shows minimum participants under the on-demand group', async ({
    page,
    request,
  }) => {
    const onDemand = await createLecture(request, token, {
      type: 'ON_DEMAND',
      title: 'E2E On-Demand Lecture',
      minimumParticipants: 12,
      locale: 'he',
    });
    extraIds.push(onDemand.id);

    await page.goto('/lectures');

    await expect(page.locator('[data-testid="ondemand-group-heading"]')).toBeVisible();
    const card = cardById(page, onDemand.id);
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute('data-type', 'ON_DEMAND');
    await expect(card.locator('[data-testid="lecture-card-min"]')).toContainText('12');
    // On-demand cards do not render a fixed date.
    await expect(card.locator('[data-testid="lecture-card-date"]')).toHaveCount(0);
  });

  test('LEC-N1: Past-dated scheduled lecture is NOT shown', async ({ page, request }) => {
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - 1);

    const pastLecture = await createLecture(request, token, {
      type: 'SCHEDULED',
      title: 'E2E Past Lecture',
      date: pastDate.toISOString(),
    });
    extraIds.push(pastLecture.id);

    await page.goto('/lectures');
    await expect(cardById(page, upcomingLecture.id)).toBeVisible();
    await expect(cardById(page, pastLecture.id)).toHaveCount(0);
  });

  test('LEC-E1: Far-past scheduled lecture is NOT shown', async ({ page, request }) => {
    const oldLecture = await createLecture(request, token, {
      type: 'SCHEDULED',
      title: 'E2E Far Past Lecture',
      date: new Date('2020-01-01T00:00:00.000Z').toISOString(),
    });
    extraIds.push(oldLecture.id);

    await page.goto('/lectures');
    await expect(cardById(page, upcomingLecture.id)).toBeVisible();
    await expect(cardById(page, oldLecture.id)).toHaveCount(0);
  });

  test('LEC-E2: Far-future scheduled lecture is shown', async ({ page, request }) => {
    const futureLecture = await createLecture(request, token, {
      type: 'SCHEDULED',
      title: 'E2E Far Future Lecture',
      date: new Date('2099-12-31T00:00:00.000Z').toISOString(),
    });
    extraIds.push(futureLecture.id);

    await page.goto('/lectures');
    await expect(cardById(page, futureLecture.id)).toBeVisible();
  });

  test('LEC-D1: Clicking a scheduled card opens its detail page', async ({ page }) => {
    await page.goto('/lectures');
    await cardById(page, upcomingLecture.id).click();

    await expect(page).toHaveURL(new RegExp(`/lectures/${upcomingLecture.slug}$`));
    await expect(page.locator('[data-testid="lecture-title"]')).toHaveText('E2E Upcoming Lecture');
    await expect(page.locator('[data-testid="lecture-date"]')).toBeVisible();
    await expect(page.locator('[data-testid="booking-price"]')).toContainText('₪');
    await expect(page.locator('[data-testid="lecture-cta"]')).toHaveAttribute('href', /wa\.me|whatsapp/);
  });

  test('LEC-D2: On-demand detail shows minimum and price-on-request fallback', async ({
    page,
    request,
  }) => {
    const onDemand = await createLecture(request, token, {
      type: 'ON_DEMAND',
      title: 'E2E On-Demand Detail',
      minimumParticipants: 15,
      locale: 'he',
      // no price -> price-on-request fallback
    });
    extraIds.push(onDemand.id);

    await page.goto(`/lectures/${onDemand.slug}`);
    await expect(page.locator('[data-testid="lecture-title"]')).toHaveText('E2E On-Demand Detail');
    await expect(page.locator('[data-testid="lecture-min"]')).toContainText('15');
    await expect(page.locator('[data-testid="booking-min"]')).toContainText('15');
    await expect(page.locator('[data-testid="booking-price"]')).not.toContainText('₪');
    // Scheduled-only date fact is absent.
    await expect(page.locator('[data-testid="lecture-date"]')).toHaveCount(0);
  });

  test('LEC-D3: Unknown slug renders the not-found state', async ({ page }) => {
    await page.goto('/lectures/does-not-exist-xyz');
    await expect(page.locator('[data-testid="lecture-not-found"]')).toBeVisible();
  });

  test('LEC-N2: Past scheduled lecture detail is not publicly reachable', async ({
    page,
    request,
  }) => {
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - 1);
    const pastLecture = await createLecture(request, token, {
      type: 'SCHEDULED',
      title: 'E2E Hidden Past Detail',
      date: pastDate.toISOString(),
    });
    extraIds.push(pastLecture.id);

    await page.goto(`/lectures/${pastLecture.slug}`);
    await expect(page.locator('[data-testid="lecture-not-found"]')).toBeVisible();
  });
});
