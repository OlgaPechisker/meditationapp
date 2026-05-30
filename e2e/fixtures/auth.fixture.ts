import { test as base, Page } from '@playwright/test';
import path from 'path';

export const STORAGE_STATE = path.join(__dirname, '..', '.auth', 'admin.json');

export const adminTest = base.extend<{ adminPage: Page }>({
  storageState: STORAGE_STATE,
  adminPage: async ({ page }, use) => {
    await use(page);
  },
});

export { expect } from '@playwright/test';
