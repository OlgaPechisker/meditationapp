import { adminTest, expect } from '../fixtures/auth.fixture';
import { getAdminToken, createBlogPost, deleteBlogPost } from '../fixtures/factory';

adminTest.describe('Admin Blog', () => {
  let token = '';
  const postsToCleanup: number[] = [];

  adminTest.beforeEach(async ({ request }) => {
    token = await getAdminToken(request);
    postsToCleanup.length = 0;
  });

  adminTest.afterEach(async ({ request }) => {
    for (const id of postsToCleanup) {
      await deleteBlogPost(request, token, id).catch(() => {});
    }
  });

  adminTest('ABLOG-P1: /admin/blog shows all posts including drafts', async ({
    page,
    request,
  }) => {
    const published = await createBlogPost(request, token, {
      publishedAt: new Date(Date.now() - 60_000).toISOString(),
    });
    postsToCleanup.push(published.id);

    const draft = await createBlogPost(request, token, {
      // No publishedAt → saved as draft
    });
    postsToCleanup.push(draft.id);

    await page.goto('/admin/blog');

    await expect(
      page.locator(`[data-testid="post-row"][data-slug="${published.slug}"]`),
    ).toBeVisible();
    await expect(
      page.locator(`[data-testid="post-row"][data-slug="${draft.slug}"]`),
    ).toBeVisible();
  });

  adminTest(
    'ABLOG-P2: Create blog post without publishedAt → saved as draft, NOT in public list',
    async ({ page }) => {
      // Unique slug; no ID available from UI so cleanup is not done via API for this test
      const slug = `ablog-p2-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      await page.goto('/admin/blog');

      await adminTest.step('open form', async () => {
        await page.locator('[data-testid="add-post-btn"]').click();
        await expect(page.locator('[data-testid="post-form"]')).toBeVisible();
      });

      await page.locator('[data-testid="field-slug"]').fill(slug);
      await page.locator('[data-testid="field-title"]').fill('ABLOG-P2 Draft Post');
      await page.locator('[data-testid="field-content"]').fill('Draft content body.');
      // Intentionally leave publishedAt empty → draft
      await page.locator('[data-testid="form-save"]').click();

      // Draft appears in admin list
      await expect(page.locator(`[data-testid="post-row"][data-slug="${slug}"]`)).toBeVisible();

      // Draft NOT visible on public blog
      await page.goto('/blog');
      await expect(
        page.locator(`[data-testid="blog-card"][data-slug="${slug}"]`),
      ).not.toBeVisible();
    },
  );

  adminTest(
    'ABLOG-P3: Create blog post with past publishedAt → appears in public /blog',
    async ({ page }) => {
      // Unique slug; cleanup not done via API (no ID from UI)
      const slug = `ablog-p3-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      // datetime-local format: "YYYY-MM-DDTHH:mm"
      const publishedAt = new Date(Date.now() - 60_000).toISOString().slice(0, 16);

      await page.goto('/admin/blog');

      await adminTest.step('open form', async () => {
        await page.locator('[data-testid="add-post-btn"]').click();
        await expect(page.locator('[data-testid="post-form"]')).toBeVisible();
      });

      await page.locator('[data-testid="field-slug"]').fill(slug);
      await page.locator('[data-testid="field-title"]').fill('ABLOG-P3 Published Post');
      await page.locator('[data-testid="field-content"]').fill('Published post content body.');
      await page.locator('[data-testid="field-publishedAt"]').fill(publishedAt);
      await page.locator('[data-testid="form-save"]').click();

      await expect(page.locator(`[data-testid="post-row"][data-slug="${slug}"]`)).toBeVisible();

      // Verify on public blog
      await page.goto('/blog');
      await expect(
        page.locator(`[data-testid="blog-card"][data-slug="${slug}"]`),
      ).toBeVisible();
    },
  );

  adminTest('ABLOG-P4: Edit post → updates reflected on public page', async ({
    page,
    request,
  }) => {
    const post = await createBlogPost(request, token, {
      title: 'ABLOG-P4 Original Title',
      publishedAt: new Date(Date.now() - 60_000).toISOString(),
    });
    postsToCleanup.push(post.id);

    const newTitle = `ABLOG-P4 Updated ${Date.now()}`;

    await page.goto('/admin/blog');

    const row = page.locator(`[data-testid="post-row"][data-slug="${post.slug}"]`);
    await expect(row).toBeVisible();
    await row.locator('[data-testid="post-edit-btn"]').click();
    await expect(page.locator('[data-testid="post-form"]')).toBeVisible();

    await page.locator('[data-testid="field-title"]').fill(newTitle);
    await page.locator('[data-testid="form-save"]').click();

    // Verify updated in admin list
    await expect(
      page
        .locator(`[data-testid="post-row"][data-slug="${post.slug}"]`)
        .locator('[data-testid="post-title"]'),
    ).toContainText(newTitle);

    // Verify reflected on public post page
    await page.goto(`/blog/${post.slug}`);
    await expect(page.locator('[data-testid="post-title"]')).toContainText(newTitle);
  });

  adminTest(
    'ABLOG-P5: Delete post → soft-deleted; no longer in public list; still visible in admin',
    async ({ page, request }) => {
      const post = await createBlogPost(request, token, {
        publishedAt: new Date(Date.now() - 60_000).toISOString(),
      });
      postsToCleanup.push(post.id);

      await page.goto('/admin/blog');

      const row = page.locator(`[data-testid="post-row"][data-slug="${post.slug}"]`);
      await expect(row).toBeVisible();
      await row.locator('[data-testid="post-delete-btn"]').click();

      // Soft-deleted post still appears in admin list
      await expect(
        page.locator(`[data-testid="post-row"][data-slug="${post.slug}"]`),
      ).toBeVisible();

      // Soft-deleted post NOT shown on public blog
      await page.goto('/blog');
      await expect(
        page.locator(`[data-testid="blog-card"][data-slug="${post.slug}"]`),
      ).not.toBeVisible();
    },
  );

  adminTest('ABLOG-N1: Create post with empty title → validation error', async ({ page }) => {
    await page.goto('/admin/blog');

    await adminTest.step('open form', async () => {
      await page.locator('[data-testid="add-post-btn"]').click();
      await expect(page.locator('[data-testid="post-form"]')).toBeVisible();
    });

    const slug = `ablog-n1-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await page.locator('[data-testid="field-slug"]').fill(slug);
    // Leave title empty
    await page.locator('[data-testid="field-content"]').fill('Some content');
    await page.locator('[data-testid="form-save"]').click();

    await expect(page.locator('[data-testid="form-error"]')).toBeVisible();
  });

  adminTest('ABLOG-N2: Create post with empty content → validation error', async ({ page }) => {
    await page.goto('/admin/blog');

    await adminTest.step('open form', async () => {
      await page.locator('[data-testid="add-post-btn"]').click();
      await expect(page.locator('[data-testid="post-form"]')).toBeVisible();
    });

    const slug = `ablog-n2-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await page.locator('[data-testid="field-slug"]').fill(slug);
    await page.locator('[data-testid="field-title"]').fill('Some Title');
    // Leave content empty
    await page.locator('[data-testid="form-save"]').click();

    await expect(page.locator('[data-testid="form-error"]')).toBeVisible();
  });

  adminTest(
    'ABLOG-N3: Create post with duplicate slug+locale → server 4xx, form-error shown',
    async ({ page, request }) => {
      const existing = await createBlogPost(request, token, { locale: 'he' });
      postsToCleanup.push(existing.id);

      await page.goto('/admin/blog');

      await adminTest.step('open form', async () => {
        await page.locator('[data-testid="add-post-btn"]').click();
        await expect(page.locator('[data-testid="post-form"]')).toBeVisible();
      });

      // Same slug + default locale (he) → should trigger duplicate error
      await page.locator('[data-testid="field-slug"]').fill(existing.slug);
      await page.locator('[data-testid="field-title"]').fill('Duplicate Post Title');
      await page.locator('[data-testid="field-content"]').fill('Some content');
      await page.locator('[data-testid="form-save"]').click();

      await expect(page.locator('[data-testid="form-error"]')).toBeVisible();
    },
  );
});
