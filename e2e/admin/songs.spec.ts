import { adminTest, expect, Page } from '../fixtures/auth.fixture';
import { createSong, deleteSong, getAdminToken } from '../fixtures/factory';

const testImage = {
  name: 'test-image.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9nt9sAAAAASUVORK5CYII=',
    'base64',
  ),
};

function getSortOrderInput(page: Page) {
  return page.locator('[data-testid="field-sortOrder"], [data-testid="song-form"] input[type="number"]').first();
}

async function getSongRowIds(page: Page) {
  const ids = await page
    .locator('[data-testid="song-row"]')
    .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-id')));

  return ids.filter((id): id is string => Boolean(id));
}

async function waitForNewSongId(page: Page, existingIds: Set<string>) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const currentIds = await getSongRowIds(page);
    const newId = currentIds.find((id) => !existingIds.has(id));

    if (newId) {
      return Number(newId);
    }

    await page.waitForTimeout(500);
  }

  throw new Error('New song row was not found after saving the form.');
}

adminTest.describe('Admin Songs', () => {
  let token = '';
  const songsToCleanup: number[] = [];

  adminTest.beforeEach(async ({ request }) => {
    token = await getAdminToken();
    songsToCleanup.length = 0;
  });

  adminTest.afterEach(async ({ request }) => {
    for (const id of songsToCleanup) {
      await deleteSong(request, token, id).catch(() => {});
    }
  });

  adminTest('ASON-P1: /admin/songs lists all songs', async ({ page, request }) => {
    const song = await createSong(request, token, {
      imageUrl: `https://placehold.co/400x600.png?text=ASON-P1-${Date.now()}`,
    });
    songsToCleanup.push(song.id);

    await page.goto('/admin/songs');

    await expect(
      page.locator(`[data-testid="song-row"][data-id="${song.id}"]`),
    ).toBeVisible();
  });

  adminTest('ASON-P2: Create song (image + sortOrder) → appears on public /songs', async ({
    page,
  }) => {
    await page.goto('/admin/songs');

    const existingIds = new Set(await getSongRowIds(page));

    await adminTest.step('open form', async () => {
      await page.locator('[data-testid="add-song-btn"]').click();
      await expect(page.locator('[data-testid="song-form"]')).toBeVisible();
    });

    const form = page.locator('[data-testid="song-form"]');
    const fileInput = form.locator('input[type="file"]').first();

    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes('/api/upload') &&
          response.request().method() === 'POST' &&
          response.ok(),
        { timeout: 10000 },
      ),
      fileInput.setInputFiles(testImage),
    ]);

    await page.waitForTimeout(500);
    await getSortOrderInput(page).fill('5');
    await page.locator('[data-testid="form-save"]').click();

    const songId = await waitForNewSongId(page, existingIds);
    songsToCleanup.push(songId);

    await expect(page.locator(`[data-testid="song-row"][data-id="${songId}"]`)).toBeVisible();

    await page.goto('/songs');
    await expect(
      page.locator(`[data-testid="song-item"][data-id="${songId}"]`),
    ).toBeAttached();
  });

  adminTest('ASON-P3: Update song → reflected on public page', async ({ page, request }) => {
    const song = await createSong(request, token, {
      imageUrl: `https://placehold.co/400x600.png?text=ASON-P3-${Date.now()}`,
      sortOrder: 10,
    });
    songsToCleanup.push(song.id);

    const newSortOrder = '25';

    await page.goto('/admin/songs');

    const row = page.locator(`[data-testid="song-row"][data-id="${song.id}"]`);
    await expect(row).toBeVisible();
    await row.locator('[data-testid="song-edit-btn"]').click();
    await expect(page.locator('[data-testid="song-form"]')).toBeVisible();

    await getSortOrderInput(page).fill(newSortOrder);
    const [updateResponse] = await Promise.all([
      page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === `/api/songs/${song.id}` &&
          response.request().method() === 'PATCH',
      ),
      page.locator('[data-testid="form-save"]').click(),
    ]);
    expect(updateResponse.ok()).toBe(true);

    await expect(row).toBeVisible();
    await row.locator('[data-testid="song-edit-btn"]').click();
    await expect(page.locator('[data-testid="song-form"]')).toBeVisible();
    await expect(getSortOrderInput(page)).toHaveValue(newSortOrder);
  });

  adminTest('ASON-P4: Delete song → no longer on public /songs', async ({ page, request }) => {
    const song = await createSong(request, token, {
      imageUrl: `https://placehold.co/400x600.png?text=ASON-P4-${Date.now()}`,
    });
    // Not added to songsToCleanup — deleted via UI

    await page.goto('/admin/songs');

    const row = page.locator(`[data-testid="song-row"][data-id="${song.id}"]`);
    await expect(row).toBeVisible();
    await row.locator('[data-testid="song-delete-btn"]').click();

    await expect(
      page.locator(`[data-testid="song-row"][data-id="${song.id}"]`),
    ).not.toBeVisible();

    await page.goto('/songs');
    await expect(
      page.locator(`[data-testid="song-item"][data-id="${song.id}"]`),
    ).not.toBeAttached();
  });

  adminTest(
    'ASON-P5: sortOrder is respected on public page (song with lower sortOrder appears first)',
    async ({ page, request }) => {
      const song1 = await createSong(request, token, {
        imageUrl: `https://placehold.co/400x600.png?text=ASON-P5-High-${Date.now()}`,
        sortOrder: 100,
      });
      songsToCleanup.push(song1.id);

      const song2 = await createSong(request, token, {
        imageUrl: `https://placehold.co/400x600.png?text=ASON-P5-Low-${Date.now()}`,
        sortOrder: 1,
      });
      songsToCleanup.push(song2.id);

      await page.goto('/songs');

      await expect(page.locator(`[data-testid="song-item"][data-id="${song1.id}"]`)).toBeAttached();
      await expect(page.locator(`[data-testid="song-item"][data-id="${song2.id}"]`)).toBeAttached();

      const allIds = await page
        .locator('[data-testid="song-item"]')
        .evaluateAll((els) => els.map((el) => el.getAttribute('data-id')));

      const idx1 = allIds.indexOf(String(song1.id));
      const idx2 = allIds.indexOf(String(song2.id));

      expect(idx2).toBeLessThan(idx1);
    },
  );

  adminTest('ASON-N1: Create song without an image → validation error', async ({ page }) => {
    await page.goto('/admin/songs');

    await adminTest.step('open form', async () => {
      await page.locator('[data-testid="add-song-btn"]').click();
      await expect(page.locator('[data-testid="song-form"]')).toBeVisible();
    });

    await getSortOrderInput(page).fill('3');
    await page.locator('[data-testid="form-save"]').click();

    await expect(page.locator('[data-testid="form-error"]')).toBeVisible();
  });
});
