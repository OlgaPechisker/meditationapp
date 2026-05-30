import { test, expect } from '@playwright/test';
import {
  getAdminToken,
  createBlogPost,
  deleteBlogPost,
  createComment,
  approveComment,
  deleteComment,
} from '../fixtures/factory';

test.describe('Public Blog', () => {
  let token = '';
  let post: { id: number; slug: string; title: string };

  // Extra resources created within individual tests that need cleanup
  const postsToCleanup: number[] = [];
  const commentsToCleanup: number[] = [];

  test.beforeEach(async ({ request }) => {
    token = await getAdminToken(request);
    postsToCleanup.length = 0;
    commentsToCleanup.length = 0;
    post = await createBlogPost(request, token, {
      title: 'E2E Test Blog Post',
      content: '<p>Full content of the e2e test post.</p>',
      excerpt: 'Test excerpt for the e2e post.',
      locale: 'he',
      publishedAt: new Date(Date.now() - 60_000).toISOString(),
    });
  });

  test.afterEach(async ({ request }) => {
    for (const id of commentsToCleanup) {
      await deleteComment(request, token, id).catch(() => {});
    }
    for (const id of postsToCleanup) {
      await deleteBlogPost(request, token, id).catch(() => {});
    }
    if (post) {
      await deleteBlogPost(request, token, post.id).catch(() => {});
    }
  });

  // ---------------------------------------------------------------------------
  // Happy-path
  // ---------------------------------------------------------------------------

  test('BLOG-P1: /blog renders list of published posts with excerpt and date', async ({
    page,
  }) => {
    await page.goto('/blog');
    const card = page.locator(`[data-testid="blog-card"][data-slug="${post.slug}"]`);
    await expect(card).toBeVisible();
    await expect(card.locator('[data-testid="blog-card-title"]')).toBeVisible();
    await expect(card.locator('[data-testid="blog-card-date"]')).toBeVisible();
  });

  test('BLOG-P2: Click post card → /blog/:slug renders full content', async ({ page }) => {
    await page.goto('/blog');
    await page.locator(`[data-testid="blog-card"][data-slug="${post.slug}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/blog/${post.slug}`));
    await expect(page.locator('[data-testid="post-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="post-date"]')).toBeVisible();
    await expect(page.locator('[data-testid="post-content"]')).toBeVisible();
  });

  test('BLOG-P3: Approved comments are shown on blog post', async ({ page, request }) => {
    const comment = await createComment(request, post.id, {
      authorName: 'Approved Commenter',
      content: 'This is an approved comment.',
    }, token);
    commentsToCleanup.push(comment.id);
    await approveComment(request, token, comment.id);

    await page.goto(`/blog/${post.slug}`);
    await expect(page.locator('[data-testid="comments-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="comment-item"]')).toBeVisible();
    await expect(page.locator('[data-testid="comment-author-name"]')).toContainText(
      'Approved Commenter',
    );
  });

  test('BLOG-P4: Submit valid comment → success message shown', async ({ page }) => {
    await page.goto(`/blog/${post.slug}`);
    await page.locator('[data-testid="author-name-input"]').fill('Happy Visitor');
    await page.locator('[data-testid="comment-content-input"]').fill('Great post, thank you!');
    await page.locator('[data-testid="comment-submit"]').click();
    await expect(page.locator('[data-testid="comment-success"]')).toBeVisible();
  });

  test('BLOG-P5: After admin approval, comment appears in the post', async ({
    page,
    request,
  }) => {
    const comment = await createComment(request, post.id, {
      authorName: 'Pending Author',
      content: 'Comment pending approval — unique content xyz987.',
    }, token);
    commentsToCleanup.push(comment.id);

    // Before approval: comment must not be visible
    await page.goto(`/blog/${post.slug}`);
    await expect(
      page.locator('[data-testid="comment-item"]').filter({ hasText: 'pending approval' }),
    ).not.toBeVisible();

    // Approve via API, then reload
    await approveComment(request, token, comment.id);
    await page.reload();
    await expect(page.locator('[data-testid="comment-text"]')).toContainText(
      'Comment pending approval',
    );
  });

  test('BLOG-P6: Future-scheduled post is NOT in public /blog list', async ({
    page,
    request,
  }) => {
    const futurePost = await createBlogPost(request, token, {
      title: 'Future Post Not Yet Published',
      publishedAt: new Date(Date.now() + 24 * 60 * 60 * 1_000).toISOString(),
    });
    postsToCleanup.push(futurePost.id);

    await page.goto('/blog');
    // Wait for page load — current published post must be visible
    await expect(
      page.locator(`[data-testid="blog-card"][data-slug="${post.slug}"]`),
    ).toBeVisible();
    // Future post must not appear
    await expect(
      page.locator(`[data-testid="blog-card"][data-slug="${futurePost.slug}"]`),
    ).not.toBeVisible();
  });

  test('BLOG-P7: Post scheduled at past time IS visible in public list', async ({
    page,
    request,
  }) => {
    const pastPost = await createBlogPost(request, token, {
      title: 'Past Scheduled Post',
      publishedAt: new Date(Date.now() - 60_000).toISOString(),
    });
    postsToCleanup.push(pastPost.id);

    await page.goto('/blog');
    await expect(
      page.locator(`[data-testid="blog-card"][data-slug="${pastPost.slug}"]`),
    ).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Negative / validation
  // ---------------------------------------------------------------------------

  test('BLOG-N1: /blog/non-existent-slug → 404 UI shown', async ({ page }) => {
    await page.goto('/blog/non-existent-slug-xyz-12345');
    await expect(page.locator('[data-testid="post-not-found"]')).toBeVisible();
  });

  test('BLOG-N2: Submit comment with empty name → no success', async ({ page }) => {
    await page.goto(`/blog/${post.slug}`);
    // Leave author-name-input empty
    await page.locator('[data-testid="comment-content-input"]').fill('Some content here.');
    await page.locator('[data-testid="comment-submit"]').click();
    await expect(page.locator('[data-testid="comment-success"]')).not.toBeVisible({
      timeout: 4_000,
    });
  });

  test('BLOG-N3: Submit comment with empty content → no success', async ({ page }) => {
    await page.goto(`/blog/${post.slug}`);
    await page.locator('[data-testid="author-name-input"]').fill('Some Name');
    // Leave comment-content-input empty
    await page.locator('[data-testid="comment-submit"]').click();
    await expect(page.locator('[data-testid="comment-success"]')).not.toBeVisible({
      timeout: 4_000,
    });
  });

  test('BLOG-N4: Submit comment with content > 2000 chars → no success', async ({ page }) => {
    await page.goto(`/blog/${post.slug}`);
    await page.locator('[data-testid="author-name-input"]').fill('Long Content Author');
    await page.locator('[data-testid="comment-content-input"]').fill('x'.repeat(2001));
    await page.locator('[data-testid="comment-submit"]').click();
    await expect(page.locator('[data-testid="comment-success"]')).not.toBeVisible({
      timeout: 4_000,
    });
  });

  test('BLOG-N5: Submit comment with author name > 100 chars → no success', async ({ page }) => {
    await page.goto(`/blog/${post.slug}`);
    await page.locator('[data-testid="author-name-input"]').fill('A'.repeat(101));
    await page.locator('[data-testid="comment-content-input"]').fill('Valid content here.');
    await page.locator('[data-testid="comment-submit"]').click();
    await expect(page.locator('[data-testid="comment-success"]')).not.toBeVisible({
      timeout: 4_000,
    });
  });

  test('BLOG-N6: Unapproved comments are NOT visible to public', async ({ page, request }) => {
    const comment = await createComment(request, post.id, {
      authorName: 'Unapproved Author',
      content: 'This comment is not yet approved.',
    }, token);
    commentsToCleanup.push(comment.id);

    await page.goto(`/blog/${post.slug}`);
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('[data-testid="comment-item"]').filter({ hasText: 'not yet approved' }),
    ).not.toBeVisible();
  });

  test('BLOG-N7: XSS payload in comment content is rendered escaped', async ({
    page,
    request,
  }) => {
    let scriptExecuted = false;
    page.on('dialog', async (dialog) => {
      scriptExecuted = true;
      await dialog.dismiss();
    });

    const comment = await createComment(request, post.id, {
      authorName: 'XSS Tester',
      content: '<script>alert("xss-content")</script>Visible text after script.',
    }, token);
    commentsToCleanup.push(comment.id);
    await approveComment(request, token, comment.id);

    await page.goto(`/blog/${post.slug}`);
    await expect(page.locator('[data-testid="comment-item"]')).toBeVisible();

    // Script must not execute
    expect(scriptExecuted).toBe(false);

    // Content must be present as escaped text, not as an injected element
    const textContent = await page
      .locator('[data-testid="comment-text"]')
      .first()
      .textContent();
    expect(textContent).toContain('<script>');
  });

  test('BLOG-N8: XSS payload in comment author name is rendered escaped', async ({
    page,
    request,
  }) => {
    let scriptExecuted = false;
    page.on('dialog', async (dialog) => {
      scriptExecuted = true;
      await dialog.dismiss();
    });

    const comment = await createComment(request, post.id, {
      authorName: '<script>alert("xss-author")</script>Safe Author',
      content: 'Normal comment content.',
    }, token);
    commentsToCleanup.push(comment.id);
    await approveComment(request, token, comment.id);

    await page.goto(`/blog/${post.slug}`);
    await expect(page.locator('[data-testid="comment-item"]')).toBeVisible();

    expect(scriptExecuted).toBe(false);

    const authorText = await page
      .locator('[data-testid="comment-author-name"]')
      .first()
      .textContent();
    expect(authorText).toContain('<script>');
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  test('BLOG-E4: Honeypot field filled → comment not persisted', async ({ page }) => {
    const honeypotContent = `Honeypot test content unique ${Date.now()}`;

    await page.goto(`/blog/${post.slug}`);
    await page.locator('[data-testid="author-name-input"]').fill('Bot Author');
    await page.locator('[data-testid="comment-content-input"]').fill(honeypotContent);
    // Fill honeypot field (may be visually hidden — use force)
    await page.locator('[data-testid="honeypot-input"]').fill('I am a bot', { force: true });
    await page.locator('[data-testid="comment-submit"]').click();

    await page.waitForLoadState('networkidle');

    // Reload to check persisted state
    await page.reload();
    await page.waitForLoadState('networkidle');

    // The honeypot comment must not appear in the comments list
    const honeypotItem = page
      .locator('[data-testid="comment-text"]')
      .filter({ hasText: honeypotContent });
    await expect(honeypotItem).not.toBeVisible();
  });

  test('BLOG-E5: Deleted post URL → 404 UI shown', async ({ page, request }) => {
    const tempPost = await createBlogPost(request, token, {
      publishedAt: new Date(Date.now() - 60_000).toISOString(),
    });
    const slug = tempPost.slug;
    // Delete it immediately; do NOT add to postsToCleanup since it's gone
    await deleteBlogPost(request, token, tempPost.id);

    await page.goto(`/blog/${slug}`);
    await expect(page.locator('[data-testid="post-not-found"]')).toBeVisible();
  });

  test('BLOG-E6: Post with no comments shows no-comments-msg', async ({ page }) => {
    // post from beforeEach has no comments
    await page.goto(`/blog/${post.slug}`);
    await expect(page.locator('[data-testid="no-comments-msg"]')).toBeVisible();
  });
});
