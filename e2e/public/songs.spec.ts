import { test, expect } from '@playwright/test';
import { getAdminToken, createSong, deleteSong } from '../fixtures/factory';

test.describe('Public Songs', () => {
  let token = '';
  let song: { id: number; title: string };

  test.beforeEach(async ({ request }) => {
    token = await getAdminToken(request);
    song = await createSong(request, token, {
      title: `E2E Test Song ${Date.now()}-${Math.random().toString(36).slice(2)}`,
      lyrics: 'Test song lyrics line 1\nTest song lyrics line 2',
      locale: 'he',
    });
  });

  test.afterEach(async ({ request }) => {
    if (song) {
      await deleteSong(request, token, song.id).catch(() => {});
    }
  });

  test('SONG-P1: /songs renders all songs', async ({ page }) => {
    await page.goto('/songs');
    await expect(
      page.locator(`[data-testid="song-item"][data-id="${song.id}"]`),
    ).toBeVisible();
  });

  test('SONG-P2: Each song shows title and lyrics', async ({ page }) => {
    await page.goto('/songs');

    const songItem = page.locator(`[data-testid="song-item"][data-id="${song.id}"]`);
    await expect(songItem).toBeVisible();
    await expect(songItem.locator('[data-testid="song-title"]')).toBeVisible();

    const lyricsLocator = songItem.locator('[data-testid="song-lyrics"]');
    const isLyricsVisible = await lyricsLocator.isVisible();

    if (!isLyricsVisible) {
      // Lyrics may be behind a toggle/accordion — expand them
      await songItem.locator('[data-testid="song-toggle-btn"]').click();
    }

    await expect(lyricsLocator).toBeVisible();
    await expect(lyricsLocator).toContainText('Test song lyrics');
  });
});
