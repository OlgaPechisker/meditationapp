import { adminTest, expect } from '../fixtures/auth.fixture';
import {
  getAdminToken,
  createBlogPost,
  deleteBlogPost,
  createComment,
  deleteComment,
} from '../fixtures/factory';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

adminTest.describe('Admin Comments', () => {
  let token = '';
  let post: { id: number; slug: string };
  const commentsToCleanup: number[] = [];

  adminTest.beforeEach(async ({ request }) => {
    token = await getAdminToken(request);
    commentsToCleanup.length = 0;
    post = await createBlogPost(request, token, {
      title: 'ACMT Blog Post',
      publishedAt: new Date(Date.now() - 60_000).toISOString(),
    });
  });

  adminTest.afterEach(async ({ request }) => {
    for (const id of commentsToCleanup) {
      await deleteComment(request, token, id).catch(() => {});
    }
    if (post) {
      await deleteBlogPost(request, token, post.id).catch(() => {});
    }
  });

  adminTest('ACMT-P1: /admin/comments lists pending (unapproved) comments', async ({
    page,
    request,
  }) => {
    const comment = await createComment(request, post.id, {
      authorName: 'ACMT-P1 Author',
      content: 'ACMT-P1 pending comment content.',
    }, token);
    commentsToCleanup.push(comment.id);

    await page.goto('/admin/comments');

    await expect(
      page.locator(`[data-testid="comment-card"][data-id="${comment.id}"]`),
    ).toBeVisible();
    await expect(
      page
        .locator(`[data-testid="comment-card"][data-id="${comment.id}"]`)
        .locator('[data-testid="comment-author"]'),
    ).toContainText('ACMT-P1 Author');
    await expect(
      page
        .locator(`[data-testid="comment-card"][data-id="${comment.id}"]`)
        .locator('[data-testid="comment-content"]'),
    ).toContainText('ACMT-P1 pending comment content.');
  });

  adminTest(
    'ACMT-P2: Approve comment → moves off pending list, appears on public blog post',
    async ({ page, request }) => {
      const comment = await createComment(request, post.id, {
        authorName: 'ACMT-P2 Author',
        content: 'ACMT-P2 comment to approve.',
      }, token);
      commentsToCleanup.push(comment.id);

      await page.goto('/admin/comments');

      const card = page.locator(`[data-testid="comment-card"][data-id="${comment.id}"]`);
      await expect(card).toBeVisible();
      await card.locator('[data-testid="comment-approve-btn"]').click();

      // Comment is no longer on the pending list
      await expect(
        page.locator(`[data-testid="comment-card"][data-id="${comment.id}"]`),
      ).not.toBeVisible();

      // Approved comment appears on the public blog post
      await page.goto(`/blog/${post.slug}`);
      await expect(
        page.locator('[data-testid="comment-item"]').filter({ hasText: 'ACMT-P2 comment to approve.' }),
      ).toBeVisible();
    },
  );

  adminTest('ACMT-P3: Delete comment → removed from pending list', async ({
    page,
    request,
  }) => {
    const comment = await createComment(request, post.id, {
      authorName: 'ACMT-P3 Author',
      content: 'ACMT-P3 comment to reject.',
    }, token);
    // No push to commentsToCleanup — deleted via UI

    await page.goto('/admin/comments');

    const card = page.locator(`[data-testid="comment-card"][data-id="${comment.id}"]`);
    await expect(card).toBeVisible();
    await card.locator('[data-testid="comment-reject-btn"]').click();

    // Comment is gone from pending list
    await expect(
      page.locator(`[data-testid="comment-card"][data-id="${comment.id}"]`),
    ).not.toBeVisible();
  });

  adminTest(
    'ACMT-N1: Unauthenticated GET /api/comments/admin/pending → 401',
    async ({ request }) => {
      const res = await request.get(`${API_URL}/api/comments/admin/pending`);
      expect(res.status()).toBe(401);
    },
  );

  adminTest(
    'ACMT-N2: Approve non-existent comment ID → API returns 404 or 500',
    async ({ request }) => {
      const nonExistentId = 999_999_999;
      const res = await request.patch(`${API_URL}/api/comments/${nonExistentId}/approve`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect([404, 500]).toContain(res.status());
    },
  );
});
