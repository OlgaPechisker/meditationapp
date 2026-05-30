import { adminTest, expect } from '../fixtures/auth.fixture';
import { getAdminToken, createSong, deleteSong } from '../fixtures/factory';

adminTest.describe('Admin Songs', () => {
  let token = '';
  const songsToCleanup: number[] = [];

  adminTest.beforeEach(async ({ request }) => {
    token = await getAdminToken(request);
    songsToCleanup.length = 0;
  });

  adminTest.afterEach(async ({ request }) => {
    for (const id of songsToCleanup) {
      await deleteSong(request, token, id).catch(() => {});
    }
  });

  adminTest('ASON-P1: /admin/songs lists all songs', async ({ page, request }) => {
    const song = await createSong(request, token, {
      title: `ASON-P1 Song ${Date.now()}`,
    });
    songsToCleanup.push(song.id);

    await page.goto('/admin/songs');

    await expect(
      page.locator(`[data-testid="song-row"][data-id="${song.id}"]`),
    ).toBeVisible();
  });

  adminTest('ASON-P2: Create song (title + lyrics) → appears on public /songs', async ({
    page,
    request,
  }) => {
    const title = `ASON-P2 Song ${Date.now()}-${Math.random().toString(36).slice(2)}`;

    await page.goto('/admin/songs');

    await adminTest.step('open form', async () => {
      await page.locator('[data-testid="add-song-btn"]').click();
      await expect(page.locator('[data-testid="song-form"]')).toBeVisible();
    });

    await page.locator('[data-testid="field-title"]').fill(title);
    await page.locator('[data-testid="field-lyrics"]').fill('ASON-P2 song lyrics line 1\nLine 2');
    await page.locator('[data-testid="form-save"]').click();

    // Find the newly created row in admin
    const row = page.locator('[data-testid="song-row"]').filter({
      has: page.locator('[data-testid="song-title"]', { hasText: title }),
    });
    await expect(row).toBeVisible();

    // Get the song id from the row for cleanup
    const songId = await row.getAttribute('data-id');
    if (songId) songsToCleanup.push(Number(songId));

    // Verify on public /songs
    await page.goto('/songs');
    if (songId) {
      await expect(
        page.locator(`[data-testid="song-item"][data-id="${songId}"]`),
      ).toBeVisible();
    } else {
      // Fallback: verify by title text
      await expect(
        page.locator('[data-testid="song-item"]').filter({ hasText: title }),
      ).toBeVisible();
    }
  });

  adminTest('ASON-P3: Update song lyrics → reflected on public page', async ({
    page,
    request,
  }) => {
    const song = await createSong(request, token, {
      title: `ASON-P3 Song ${Date.now()}`,
      lyrics: 'ASON-P3 original lyrics',
    });
    songsToCleanup.push(song.id);

    const newLyrics = `ASON-P3 updated lyrics ${Date.now()}`;

    await page.goto('/admin/songs');

    const row = page.locator(`[data-testid="song-row"][data-id="${song.id}"]`);
    await expect(row).toBeVisible();
    await row.locator('[data-testid="song-edit-btn"]').click();
    await expect(page.locator('[data-testid="song-form"]')).toBeVisible();

    await page.locator('[data-testid="field-lyrics"]').fill(newLyrics);
    await page.locator('[data-testid="form-save"]').click();

    await expect(
      page.locator(`[data-testid="song-row"][data-id="${song.id}"]`),
    ).toBeVisible();

    // Verify updated lyrics on public /songs
    await page.goto('/songs');
    const songItem = page.locator(`[data-testid="song-item"][data-id="${song.id}"]`);
    await expect(songItem).toBeVisible();

    const lyricsLocator = songItem.locator('[data-testid="song-lyrics"]');
    const isLyricsVisible = await lyricsLocator.isVisible();
    if (!isLyricsVisible) {
      await songItem.locator('[data-testid="song-toggle-btn"]').click();
    }
    await expect(lyricsLocator).toContainText('ASON-P3 updated lyrics');
  });

  adminTest('ASON-P4: Delete song → no longer on public /songs', async ({
    page,
    request,
  }) => {
    const song = await createSong(request, token, {
      title: `ASON-P4 Song ${Date.now()}`,
    });
    // Not added to songsToCleanup — deleted via UI

    await page.goto('/admin/songs');

    const row = page.locator(`[data-testid="song-row"][data-id="${song.id}"]`);
    await expect(row).toBeVisible();
    await row.locator('[data-testid="song-delete-btn"]').click();

    await expect(
      page.locator(`[data-testid="song-row"][data-id="${song.id}"]`),
    ).not.toBeVisible();

    // Verify gone from public /songs
    await page.goto('/songs');
    await expect(
      page.locator(`[data-testid="song-item"][data-id="${song.id}"]`),
    ).not.toBeVisible();
  });

  adminTest(
    'ASON-P5: sortOrder is respected on public page (song with lower sortOrder appears first)',
    async ({ page, request }) => {
      const song1 = await createSong(request, token, {
        title: `ASON-P5 Song High ${Date.now()}`,
        sortOrder: 100,
      });
      songsToCleanup.push(song1.id);

      const song2 = await createSong(request, token, {
        title: `ASON-P5 Song Low ${Date.now()}`,
        sortOrder: 1,
      });
      songsToCleanup.push(song2.id);

      await page.goto('/songs');

      // Wait for both songs to be present
      await expect(page.locator(`[data-testid="song-item"][data-id="${song1.id}"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="song-item"][data-id="${song2.id}"]`)).toBeVisible();

      // Check DOM order: song2 (sortOrder=1) must appear before song1 (sortOrder=100)
      const allIds = await page
        .locator('[data-testid="song-item"]')
        .evaluateAll((els) => els.map((el) => el.getAttribute('data-id')));

      const idx1 = allIds.indexOf(String(song1.id));
      const idx2 = allIds.indexOf(String(song2.id));

      expect(idx2).toBeLessThan(idx1);
    },
  );

  adminTest('ASON-N1: Create song with empty title → validation error', async ({ page }) => {
    await page.goto('/admin/songs');

    await adminTest.step('open form', async () => {
      await page.locator('[data-testid="add-song-btn"]').click();
      await expect(page.locator('[data-testid="song-form"]')).toBeVisible();
    });

    // Leave title empty
    await page.locator('[data-testid="field-lyrics"]').fill('Some lyrics here.');
    await page.locator('[data-testid="form-save"]').click();

    await expect(page.locator('[data-testid="form-error"]')).toBeVisible();
  });

  adminTest(
    'ASON-N2: Create song with duplicate title+locale → server 4xx, form-error shown',
    async ({ page, request }) => {
      const existing = await createSong(request, token, {
        title: `ASON-N2 Duplicate Song ${Date.now()}`,
        locale: 'he',
      });
      songsToCleanup.push(existing.id);

      await page.goto('/admin/songs');

      await adminTest.step('open form', async () => {
        await page.locator('[data-testid="add-song-btn"]').click();
        await expect(page.locator('[data-testid="song-form"]')).toBeVisible();
      });

      // Same title + default locale (he) → should trigger duplicate error
      await page.locator('[data-testid="field-title"]').fill(existing.title);
      await page.locator('[data-testid="field-lyrics"]').fill('Duplicate lyrics.');
      await page.locator('[data-testid="form-save"]').click();

      await expect(page.locator('[data-testid="form-error"]')).toBeVisible();
    },
  );
});
