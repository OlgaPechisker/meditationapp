import { test, expect } from '@playwright/test';
import { getAdminToken, createTreatment, deleteTreatment } from '../fixtures/factory';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

test.describe('Locale resolution via API', () => {
  let token = '';
  let heTreatment: { id: number; slug: string };
  let enTreatment: { id: number; slug: string };

  test.beforeEach(async ({ request }) => {
    token = await getAdminToken(request);
    heTreatment = await createTreatment(request, token, {
      title: 'Hebrew Treatment for Locale Test',
      locale: 'he',
    });
    enTreatment = await createTreatment(request, token, {
      title: 'English Treatment for Locale Test',
      locale: 'en',
    });
  });

  // No deleteTreatment in factory — random slugs prevent conflicts

  test.afterEach(async ({ request }) => {
    if (heTreatment?.id) await deleteTreatment(request, token, heTreatment.id).catch(() => {});
    if (enTreatment?.id) await deleteTreatment(request, token, enTreatment.id).catch(() => {});
  });

  test('LOCALE-1:GET /api/treatments?locale=he returns Hebrew content', async ({
    request,
  }) => {
    const res = await request.get(`${API_URL}/api/treatments?locale=he&limit=100`);
    expect(res.ok()).toBe(true);

    const json1 = await res.json();
    const treatments: Array<{ slug: string }> = json1.data ?? json1;
    const slugs = treatments.map((t) => t.slug);

    expect(slugs).toContain(heTreatment.slug);
    expect(slugs).not.toContain(enTreatment.slug);
  });

  test('LOCALE-2: GET /api/treatments?locale=en returns English content', async ({
    request,
  }) => {
    const res = await request.get(`${API_URL}/api/treatments?locale=en`);
    expect(res.ok()).toBe(true);

    const json2 = await res.json();
    const treatments: Array<{ slug: string }> = json2.data ?? json2;
    const slugs = treatments.map((t) => t.slug);

    expect(slugs).toContain(enTreatment.slug);
    expect(slugs).not.toContain(heTreatment.slug);
  });

  test('LOCALE-3: Accept-Language: en with no query param → en content returned', async ({
    request,
  }) => {
    const res = await request.get(`${API_URL}/api/treatments`, {
      headers: { 'Accept-Language': 'en' },
    });
    expect(res.ok()).toBe(true);

    const json3 = await res.json();
    const treatments: Array<{ slug: string }> = json3.data ?? json3;
    const slugs = treatments.map((t) => t.slug);

    expect(slugs).toContain(enTreatment.slug);
    expect(slugs).not.toContain(heTreatment.slug);
  });

  test('LOCALE-4: locale query param takes precedence over Accept-Language header', async ({
    request,
  }) => {
    const res = await request.get(`${API_URL}/api/treatments?locale=he&limit=100`, {
      headers: { 'Accept-Language': 'en' },
    });
    expect(res.ok()).toBe(true);

    const json4 = await res.json();
    const treatments: Array<{ slug: string }> = json4.data ?? json4;
    const slugs = treatments.map((t) => t.slug);

    // Query param (he) takes precedence over the Accept-Language (en) header
    expect(slugs).toContain(heTreatment.slug);
    expect(slugs).not.toContain(enTreatment.slug);
  });
});
