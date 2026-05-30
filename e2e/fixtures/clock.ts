import { Page } from '@playwright/test';

/**
 * Install a fixed clock in the browser. Use for tests that depend on Date.now()
 * client-side (animations, timeouts). For server-side time gating, seed data
 * with explicit past/future timestamps instead.
 */
export async function installFixedClock(page: Page, fixedTime: number | Date) {
  const time = fixedTime instanceof Date ? fixedTime.getTime() : fixedTime;
  await page.clock.install({ time });
}

export const FIXED_NOW = new Date('2025-01-15T12:00:00.000Z');
export const FIXED_NOW_MS = FIXED_NOW.getTime();
