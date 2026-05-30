import { test, expect } from '@playwright/test';
import {
  getAdminToken,
  createBlogPost,
  deleteBlogPost,
  createComment,
  deleteComment,
  resetRateLimit,
} from './fixtures/factory';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

/**
 * Rate-limit tests run under the `rateLimit` Playwright project which sets
 * `workers: 1` and `fullyParallel: false`.  `test.describe.configure` makes
 * the serial constraint explicit at the describe level as well.
 *
 * Because the rate-limit store is in-memory and keyed by client IP, every
 * request from this test worker shares the same counter.  Keeping all
 * rate-limit assertions in a single test guarantees a predictable order:
 *
 *   3 successful POSTs  →  429 on the 4th (API, RATE-3/SEC-3)
 *                       →  429 persists for subsequent same-IP requests (RATE-2/BLOG-E3)
 *                       →  429 returned to the browser, UI error shown (RATE-1/BLOG-E1)
 */
test.describe('Rate Limit', () => {
  test.describe.configure({ mode: 'serial' });

  test(
    'RATE-1/2/3: Rate limit — 3 comments allowed, 4th returns 429 (API + UI)',
    async ({ page, request }) => {
      const token = await getAdminToken(request);
      // Reset rate-limit store so prior test runs don't pollute this test
      await resetRateLimit(request, token);
      const post = await createBlogPost(request, token, {
        publishedAt: new Date(Date.now() - 60_000).toISOString(),
      });
      const commentIds: number[] = [];

      try {
        // ── Step 1: Three successful comments via API ──────────────────────────
        for (let i = 1; i <= 3; i++) {
          const comment = await createComment(request, post.id, {
            authorName: `Rate Limit Tester ${i}`,
            content:    `Rate limit test comment ${i} of 3`,
          });
          commentIds.push(comment.id);
        }

        // ── Step 2 (RATE-3 / SEC-3): 4th direct API POST → 429 ────────────────
        const fourthApiRes = await request.post(`${API_URL}/api/comments`, {
          data: {
            postId:     post.id,
            authorName: 'Rate Limit Tester 4',
            content:    'This comment should be rate-limited',
          },
        });
        expect(fourthApiRes.status(), '4th API comment must be rate-limited (429)').toBe(429);

        // ── Step 3 (RATE-2 / BLOG-E3): same-IP 5th request still 429 ──────────
        // Demonstrates that the limit is per-IP for the window, not per-post.
        const fifthApiRes = await request.post(`${API_URL}/api/comments`, {
          data: {
            postId:     post.id,
            authorName: 'Rate Limit Tester 5',
            content:    'Also rate-limited — same IP window',
          },
        });
        expect(fifthApiRes.status(), '5th API comment from same IP must still be 429').toBe(429);

        // ── Step 4 (RATE-1 / BLOG-E1): UI submission hits 429, error shown ─────
        // Observe the POST /api/comments response without intercepting it.
        // page.on('response', ...) fires for every response from the page;
        // we capture the status so we can assert it was 429.
        let capturedStatus = 0;
        page.on('response', (response) => {
          if (
            response.url().includes('/api/comments') &&
            response.request().method() === 'POST'
          ) {
            capturedStatus = response.status();
          }
        });

        await page.goto(`/blog/${post.slug}`);
        await expect(page.locator('[data-testid="author-name-input"]')).toBeVisible();
        await page.locator('[data-testid="author-name-input"]').fill('UI Rate Limit Tester');
        await page.locator('[data-testid="comment-content-input"]').fill('UI rate-limit test comment');
        await page.locator('[data-testid="comment-submit"]').click();

        // Wait for the intercepted POST to complete (avoids race where not.toBeVisible
        // passes before the request fires, leaving capturedStatus at 0).
        await expect.poll(() => capturedStatus, { timeout: 10_000 }).toBe(429);
        expect(capturedStatus, 'Browser comment POST should be rate-limited (429)').toBe(429);

        // Success message must NOT appear when the server rate-limits the request
        await expect(page.locator('[data-testid="comment-success"]')).not.toBeVisible();
      } finally {
        for (const id of commentIds) {
          await deleteComment(request, token, id).catch(() => {});
        }
        await deleteBlogPost(request, token, post.id).catch(() => {});
      }
    },
  );
});
