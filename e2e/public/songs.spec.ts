import { test, expect, Page } from '@playwright/test';
import { getAdminToken, createSong, deleteSong } from '../fixtures/factory';

async function navigateToSong(page: Page, songId: number) {
  const songItem = page.locator(`[data-testid="song-item"][data-id="${songId}"]`);
  const nextButton = page.locator('[data-testid="song-next-btn"]');
  const totalSongs = Math.min(await page.locator('[data-testid="song-item"]').count(), 20);

  for (let index = 0; index <= totalSongs; index += 1) {
    if (await songItem.isVisible()) {
      return songItem;
    }

    if (await nextButton.isDisabled()) {
      break;
    }

    await nextButton.click();
  }

  return songItem;
}

test.describe('Public Songs', () => {
  let token = '';
  let song: { id: number; imageUrl: string };

  test.beforeEach(async ({ request }) => {
    token = await getAdminToken(request);
    song = await createSong(request, token, {
      imageUrl: `https://placehold.co/400x600.png?text=E2E-Song-${Date.now()}`,
      sortOrder: -1000,
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
    ).toBeAttached();
  });

  test('SONG-P2: song image is displayed and can be navigated to', async ({ page }) => {
    await page.goto('/songs');

    const songItem = await navigateToSong(page, song.id);
    await expect(songItem).toBeVisible();
    await expect(songItem.locator('img')).toHaveAttribute('src', song.imageUrl);
  });

  test('SONG-P3: gallery arrow navigation', async ({ page, request }) => {
    const extraSongIds: number[] = [];
    // Use a randomized, ultra-low sortOrder base so this test's three songs are
    // deterministically ordered relative to each other and virtually guaranteed to sort
    // ahead of any other song created concurrently by parallel tests (including the shared
    // `song` from beforeEach, and other tests' own beforeEach-created songs).
    const base = -5_000_000 - Math.floor(Math.random() * 1_000_000);

    try {
      const firstSong = await createSong(request, token, {
        imageUrl: `https://placehold.co/400x600.png?text=E2E-Song-1-${Date.now()}`,
        sortOrder: base,
        locale: 'he',
      });
      extraSongIds.push(firstSong.id);

      const secondSong = await createSong(request, token, {
        imageUrl: `https://placehold.co/400x600.png?text=E2E-Song-2-${Date.now()}`,
        sortOrder: base + 1,
        locale: 'he',
      });
      extraSongIds.push(secondSong.id);

      const thirdSong = await createSong(request, token, {
        imageUrl: `https://placehold.co/400x600.png?text=E2E-Song-3-${Date.now()}`,
        sortOrder: base + 2,
        locale: 'he',
      });
      extraSongIds.push(thirdSong.id);

      await page.goto('/songs');

      const prevButton = page.locator('[data-testid="song-prev-btn"]');
      const nextButton = page.locator('[data-testid="song-next-btn"]');
      const counter = page.locator('[data-testid="song-counter"]');
      const firstSongItem = page.locator(`[data-testid="song-item"][data-id="${firstSong.id}"]`);
      const secondSongItem = page.locator(`[data-testid="song-item"][data-id="${secondSong.id}"]`);
      const thirdSongItem = page.locator(`[data-testid="song-item"][data-id="${thirdSong.id}"]`);

      await expect(firstSongItem).toBeVisible();
      await expect(prevButton).toBeDisabled();
      await expect(counter).toHaveText(/^\s*1\s*\/\s*\d+\s*$/);

      await nextButton.click();
      await expect(firstSongItem).not.toBeVisible();
      await expect(secondSongItem).toBeVisible();
      await expect(counter).toHaveText(/^\s*2\s*\/\s*\d+\s*$/);

      await nextButton.click();
      await expect(secondSongItem).not.toBeVisible();
      await expect(thirdSongItem).toBeVisible();
      await expect(counter).toHaveText(/^\s*3\s*\/\s*\d+\s*$/);

    } finally {
      for (const id of extraSongIds) {
        await deleteSong(request, token, id).catch(() => {});
      }
    }
  });
});
