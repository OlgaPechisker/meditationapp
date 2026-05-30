import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const APP_URL = process.env.APP_URL ?? 'http://localhost:4200';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin123';
export const STORAGE_STATE = path.join(__dirname, '.auth', 'admin.json');

async function globalSetup(_config: FullConfig) {
  // Ensure .auth directory exists
  const authDir = path.join(__dirname, '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Login via real API
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const apiContext = await context.request.get(API_URL); // warm up

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

  // Save storageStatewith token in localStorage
  await context.addInitScript(() => {}); // ensure context is ready
  const page = await context.newPage();
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate((t: string) => {
    localStorage.setItem('einat_token', t);
  }, token);
  await context.storageState({ path: STORAGE_STATE });

  await browser.close();
}

export default globalSetup;
