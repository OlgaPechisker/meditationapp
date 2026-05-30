import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const APP_URL = process.env.APP_URL ?? 'http://localhost:4200';

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  workers: 4,
  timeout: 60000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  globalSetup: './global.setup.ts',
  reporter: [['html', { outputFolder: '../playwright-report' }], ['list']],
  use: {
    baseURL: APP_URL,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /rate-limit\.spec\.ts/,
    },
    {
      name: 'rateLimit',
      testMatch: /rate-limit\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['chromium'],
    },
  ],
});
