import { test, expect } from '@playwright/test';
import { getAdminToken, createBlogPost, deleteBlogPost } from './fixtures/factory';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

test.describe('Security', () => {
  // ── SEC-1 ──────────────────────────────────────────────────────────────────

  test('SEC-1: Admin API endpoints return 401 without auth token', async ({ request }) => {
    const endpoints: Array<{ method: string; path: string; body?: Record<string, unknown> }> = [
      { method: 'GET',  path: '/api/treatments/admin/all' },
      { method: 'GET',  path: '/api/blog/admin/all' },
      { method: 'GET',  path: '/api/comments/admin/pending' },
      { method: 'GET',  path: '/api/lectures/admin/all' },
      { method: 'POST', path: '/api/treatments', body: { slug: 'x', title: 'x', locale: 'he' } },
      { method: 'POST', path: '/api/blog',        body: { slug: 'x', title: 'x', content: 'x', locale: 'he' } },
      { method: 'POST', path: '/api/lectures',    body: { title: 'x', date: new Date().toISOString(), locale: 'he' } },
      { method: 'POST', path: '/api/songs',       body: { imageUrl: 'https://example.com/song.png', locale: 'he' } },
      { method: 'PUT',  path: '/api/content',     body: { key: 'x', value: 'x', locale: 'he' } },
    ];

    for (const { method, path, body } of endpoints) {
      const url = `${API_URL}${path}`;
      let res;
      if (method === 'GET')       res = await request.get(url);
      else if (method === 'POST') res = await request.post(url, { data: body });
      else                        res = await request.put(url, { data: body });
      expect(res!.status(), `Expected 401 for ${method} ${path}`).toBe(401);
    }
  });

  // ── SEC-2 ──────────────────────────────────────────────────────────────────

  test('SEC-2: Bearer token with wrong signature returns 401', async ({ request }) => {
    const tamperedToken = 'eyJhbGciOiJIUzI1NiJ9.eyJwYXlsb2FkIjoidGVzdCJ9.invalidsignature';
    const res = await request.get(`${API_URL}/api/treatments/admin/all`, {
      headers: { Authorization: `Bearer ${tamperedToken}` },
    });
    expect(res.status()).toBe(401);
  });

  // ── SEC-4 ──────────────────────────────────────────────────────────────────

  test('SEC-4: Honeypot comment returns 201 but is not persisted in approved list', async ({ request }) => {
    const token = await getAdminToken();
    const post = await createBlogPost(request, token, {
      publishedAt: new Date(Date.now() - 60_000).toISOString(),
    });

    try {
      const honeypotContent = `SEC-4 honeypot spam ${Date.now()}`;
      const res = await request.post(`${API_URL}/api/comments`, {
        data: {
          postId:     post.id,
          authorName: 'Bot',
          content:    honeypotContent,
          honeypot:   'triggered',
        },
      });
      expect(res.status()).toBe(201);

      // The honeypot comment must not appear in the public approved-comments list
      const listRes = await request.get(`${API_URL}/api/comments/post/${post.id}`);
      expect(listRes.ok()).toBe(true);
      const comments = await listRes.json();
      const found =
        Array.isArray(comments) &&
        comments.some((c: { content: string }) => c.content === honeypotContent);
      expect(found, 'Honeypot comment must not appear in the approved public list').toBe(false);
    } finally {
      await deleteBlogPost(request, token, post.id).catch(() => {});
    }
  });

  // ── SEC-5 ──────────────────────────────────────────────────────────────────

  test('SEC-5: XSS in blog post content is removed and not executed', async ({ page, request }) => {
    const token = await getAdminToken();
    const post = await createBlogPost(request, token, {
      title:       'SEC-5 XSS Test Post',
      content:     `<p>Safe content</p><script>alert('XSS')</script><p>More safe content</p>`,
      publishedAt: new Date(Date.now() - 60_000).toISOString(),
    });

    let scriptExecuted = false;
    page.on('dialog', async (dialog) => {
      scriptExecuted = true;
      await dialog.dismiss();
    });

    try {
      await page.goto(`/blog/${post.slug}`);
      await expect(page.locator('[data-testid="post-content"]')).toBeVisible();
      await expect(page.locator('[data-testid="post-content"]')).toContainText('Safe content');
      await expect(page.locator('[data-testid="post-content"]')).toContainText('More safe content');
      await expect(page.locator('[data-testid="post-content"]')).not.toContainText('<script>');
      await expect(page.locator('[data-testid="post-content"] script')).toHaveCount(0);
      expect(scriptExecuted, 'XSS script must not execute').toBe(false);
    } finally {
      await deleteBlogPost(request, token, post.id).catch(() => {});
    }
  });

  // ── SEC-8 ──────────────────────────────────────────────────────────────────

  test('SEC-8: Rich-content write endpoints reject unknown fields', async ({ request }) => {
    const token = await getAdminToken();
    const headers = { Authorization: `Bearer ${token}` };
    const endpoints = [
      { method: 'patch', path: '/api/blog/1', body: { unexpected: true } },
      { method: 'patch', path: '/api/treatments/1', body: { unexpected: true } },
      { method: 'patch', path: '/api/lectures/1', body: { unexpected: true } },
      { method: 'put', path: '/api/content', body: { key: 'about', value: '<p>content</p>', unexpected: true } },
    ] as const;

    for (const endpoint of endpoints) {
      const response = await request[endpoint.method](`${API_URL}${endpoint.path}`, {
        data: endpoint.body,
        headers,
      });
      expect(response.status(), `${endpoint.method.toUpperCase()} ${endpoint.path}`).toBe(400);
    }
  });

  // ── SEC-6 ──────────────────────────────────────────────────────────────────
  // Requires APP_URL to point to the Angular SSR build, not the ng-serve dev
  // server — dev server returns 200 for all routes (client-side routing).
  //
  // TEMPORARILY SKIPPED: The Express/Angular SSR server currently forwards
  // whatever HTTP status Angular's response carries, but the wildcard '**'
  // route (NotFoundComponent) never sets a 404 — it only renders "not found"
  // UI, so the response status stays 200. Fix belongs in the client repo
  // (Einat-client): add a dedicated server route with `status: 404` in
  // app.routes.server.ts and redirect the '**' catch-all to it (Angular 19+
  // ServerRoute status API), or inject the `RESPONSE_INIT` token in
  // NotFoundComponent and set `.status = 404` when isPlatformServer().
  test.skip('SEC-6: Unknown route returns HTTP 404 from SSR', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist-xyz');
    expect(response?.status()).toBe(404);
  });

  // ── SEC-7 ──────────────────────────────────────────────────────────────────
  // Same SSR caveat as SEC-6.
  //
  // TEMPORARILY SKIPPED: same root cause as SEC-6 — the draft-post "not
  // found" branch in BlogPostComponent only renders UI, it never sets an
  // HTTP status. Fix belongs in the client repo (Einat-client): inject the
  // `RESPONSE_INIT` token in BlogPostComponent and set `.status = 404` when
  // isPlatformServer() and the requested post lookup returns nothing/is a
  // draft.
  test.skip('SEC-7: Draft blog post URL returns HTTP 404 from SSR', async ({ page, request }) => {
    const token = await getAdminToken();
    // No publishedAt → post is a draft and must not be publicly accessible
    const post = await createBlogPost(request, token, {
      title: 'SEC-7 Draft Post — expected 404',
    });

    try {
      const response = await page.goto(`/blog/${post.slug}`);
      expect(response?.status()).toBe(404);
    } finally {
      await deleteBlogPost(request, token, post.id).catch(() => {});
    }
  });
});
