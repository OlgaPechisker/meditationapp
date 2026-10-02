import { chromium, expect, FullConfig } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import path from 'path';
import fs from 'fs';
import { STORAGE_STATE } from './fixtures/auth-state';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const APP_URL = process.env.APP_URL ?? 'http://localhost:4200';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin123';

async function globalSetup(_config: FullConfig) {
  // Ensure .auth directory exists
  const authDir = path.join(__dirname, '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Login via real API
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    await context.request.get(API_URL); // warm up

    const response = await context.request.post(`${API_URL}/api/auth/login`, {
      data: { password: ADMIN_PASSWORD },
    });

    if (!response.ok()) {
      throw new Error(`Login failed: ${response.status()} ${await response.text()}`);
    }

    const { token } = await response.json();

    // Reset rate-limit store so prior runs within the same window don't pollute tests
    await context.request.delete(`${API_URL}/api/_test/rate-limit`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {/* best-effort */});

    const slug = `e2e-preflight-${randomUUID()}`;
    const title = `E2E preflight ${slug}`;
    const created = await context.request.post(`${API_URL}/api/treatments`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { slug, title, description: 'E2E API origin check', locale: 'he' },
    });
    if (!created.ok()) {
      throw new Error(`E2E preflight fixture creation failed: ${created.status()} ${await created.text()}`);
    }

    const treatment: unknown = await created.json();
    if (
      typeof treatment !== 'object' || treatment === null ||
      !('id' in treatment) || typeof treatment.id !== 'number' || !Number.isSafeInteger(treatment.id)
    ) {
      throw new Error('E2E preflight fixture response is missing a numeric id');
    }
    const id = treatment.id;
    try {
      const page = await context.newPage();
      try {
        await page.goto(`${APP_URL}/treatments/${slug}`);
        await expect(page.getByTestId('treatment-title')).toHaveText(title, { timeout: 10_000 });
      } catch (error) {
        throw new Error(
          `E2E client at ${APP_URL} cannot read fixtures from ${API_URL}. Build the client with npm run build:e2e.`,
          { cause: error },
        );
      }

      // Save storage state with token in localStorage only after confirming the API origin.
      await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
      await page.evaluate((t: string) => {
        localStorage.setItem('einat_token', t);
      }, token);
      await context.storageState({ path: STORAGE_STATE });
    } finally {
      const deleted = await context.request.delete(`${API_URL}/api/treatments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!deleted.ok()) {
        throw new Error(`E2E preflight fixture cleanup failed: ${deleted.status()} ${await deleted.text()}`);
      }
    }
  } finally {
    await browser.close();
  }
}

export default globalSetup;
