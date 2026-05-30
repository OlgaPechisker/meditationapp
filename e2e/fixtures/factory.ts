import { APIRequestContext } from '@playwright/test';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

function apiUrl(path: string) {
  return `${API_URL}${path}`;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// ---- Treatments ----
export async function createTreatment(
  request: APIRequestContext,
  token: string,
  data: {
    slug?: string;
    title?: string;
    description?: string;
    locale?: string;
    price?: string;
    imageUrl?: string;
    sortOrder?: number;
    isActive?: boolean;
  } = {}
) {
  const slug = data.slug ?? `test-treatment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const payload = {
    slug,
    title: data.title ?? `Test Treatment ${slug}`,
    description: data.description ?? 'Test description for this treatment',
    locale: data.locale ?? 'he',
    price: data.price,
    imageUrl: data.imageUrl,
    sortOrder: data.sortOrder,
    isActive: data.isActive ?? true,
  };
  const res = await request.post(apiUrl('/api/treatments'), {
    data: payload,
    headers: authHeaders(token),
  });
  if (!res.ok()) throw new Error(`createTreatment failed: ${res.status()} ${await res.text()}`);
  return res.json();
}

export async function updateTreatment(
  request: APIRequestContext,
  token: string,
  id: number,
  data: Record<string, unknown>
) {
  const res = await request.patch(apiUrl(`/api/treatments/${id}`), {
    data,
    headers: authHeaders(token),
  });
  if (!res.ok()) throw new Error(`updateTreatment failed: ${res.status()} ${await res.text()}`);
  return res.json();
}

export async function deleteTreatment(request: APIRequestContext, token: string, id: number) {
  const res = await request.delete(apiUrl(`/api/treatments/${id}`), {
    headers: authHeaders(token),
  });
  if (!res.ok() && res.status() !== 204) {
    throw new Error(`deleteTreatment failed: ${res.status()} ${await res.text()}`);
  }
}

// ---- Blog Posts ----
export async function createBlogPost(
  request: APIRequestContext,
  token: string,
  data: {
    slug?: string;
    title?: string;
    content?: string;
    excerpt?: string;
    locale?: string;
    publishedAt?: Date | string | null;
    imageUrl?: string;
  } = {}
) {
  const slug = data.slug ?? `test-post-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const payload: Record<string, unknown> = {
    slug,
    title: data.title ?? `Test Post ${slug}`,
    content: data.content ?? 'Test post content for e2e tests.',
    excerpt: data.excerpt ?? 'Test excerpt.',
    locale: data.locale ?? 'he',
    imageUrl: data.imageUrl,
  };
  if (data.publishedAt !== undefined && data.publishedAt !== null) {
    payload.publishedAt = data.publishedAt instanceof Date
      ? data.publishedAt.toISOString()
      : data.publishedAt;
  }
  const res = await request.post(apiUrl('/api/blog'), {
    data: payload,
    headers: authHeaders(token),
  });
  if (!res.ok()) throw new Error(`createBlogPost failed: ${res.status()} ${await res.text()}`);
  return res.json();
}

export async function updateBlogPost(
  request: APIRequestContext,
  token: string,
  id: number,
  data: Record<string, unknown>
) {
  const res = await request.patch(apiUrl(`/api/blog/${id}`), {
    data,
    headers: authHeaders(token),
  });
  if (!res.ok()) throw new Error(`updateBlogPost failed: ${res.status()} ${await res.text()}`);
  return res.json();
}

export async function deleteBlogPost(request: APIRequestContext, token: string, id: number) {
  const res = await request.delete(apiUrl(`/api/blog/${id}`), {
    headers: authHeaders(token),
  });
  if (!res.ok() && res.status() !== 204) {
    throw new Error(`deleteBlogPost failed: ${res.status()} ${await res.text()}`);
  }
}

// ---- Comments ----
export async function createComment(
  request: APIRequestContext,
  postId: number,
  data: {
    authorName?: string;
    content?: string;
    honeypot?: string;
  } = {},
  token?: string
) {
  const url = token ? '/api/comments/admin/create' : '/api/comments';
  const options: Parameters<typeof request.post>[1] = {
    data: {
      postId,
      authorName: data.authorName ?? 'Test Author',
      content: data.content ?? 'Test comment content.',
      honeypot: data.honeypot,
    },
  };
  if (token) options.headers = authHeaders(token);
  const res = await request.post(apiUrl(url), options);
  if (!res.ok()) throw new Error(`createComment failed: ${res.status()} ${await res.text()}`);
  return res.json();
}

export async function resetRateLimit(request: APIRequestContext, token: string) {
  const res = await request.delete(apiUrl('/api/_test/rate-limit'), {
    headers: authHeaders(token),
  });
  if (!res.ok() && res.status() !== 204) {
    throw new Error(`resetRateLimit failed: ${res.status()} ${await res.text()}`);
  }
}

export async function approveComment(request: APIRequestContext, token: string, id: number) {
  const res = await request.patch(apiUrl(`/api/comments/${id}/approve`), {
    headers: authHeaders(token),
  });
  if (!res.ok()) throw new Error(`approveComment failed: ${res.status()} ${await res.text()}`);
  return res.json();
}

export async function deleteComment(request: APIRequestContext, token: string, id: number) {
  const res = await request.delete(apiUrl(`/api/comments/${id}`), {
    headers: authHeaders(token),
  });
  if (!res.ok() && res.status() !== 204) {
    throw new Error(`deleteComment failed: ${res.status()} ${await res.text()}`);
  }
}

// ---- Lectures ----
export async function createLecture(
  request: APIRequestContext,
  token: string,
  data: {
    slug?: string;
    title?: string;
    description?: string;
    date?: string;
    location?: string;
    price?: string;
    locale?: string;
    imageUrl?: string;
    isActive?: boolean;
  } = {}
) {
  const slug = data.slug ?? `test-lecture-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  // Default: future date (1 month from now)
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 1);

  const payload: Record<string, unknown> = {
    slug,
    title: data.title ?? `Test Lecture ${slug}`,
    description: data.description ?? 'Test lecture description.',
    date: data.date ?? futureDate.toISOString(),
    location: data.location ?? 'Test Location',
    price: data.price ?? '100',
    locale: data.locale ?? 'he',
    imageUrl: data.imageUrl,
  };
  const res = await request.post(apiUrl('/api/lectures'), {
    data: payload,
    headers: authHeaders(token),
  });
  if (!res.ok()) throw new Error(`createLecture failed: ${res.status()} ${await res.text()}`);
  return res.json();
}

export async function updateLecture(
  request: APIRequestContext,
  token: string,
  id: number,
  data: Record<string, unknown>
) {
  const res = await request.patch(apiUrl(`/api/lectures/${id}`), {
    data,
    headers: authHeaders(token),
  });
  if (!res.ok()) throw new Error(`updateLecture failed: ${res.status()} ${await res.text()}`);
  return res.json();
}

export async function deleteLecture(request: APIRequestContext, token: string, id: number) {
  const res = await request.delete(apiUrl(`/api/lectures/${id}`), {
    headers: authHeaders(token),
  });
  if (!res.ok() && res.status() !== 204) {
    throw new Error(`deleteLecture failed: ${res.status()} ${await res.text()}`);
  }
}

// ---- Songs ----
export async function createSong(
  request: APIRequestContext,
  token: string,
  data: {
    title?: string;
    lyrics?: string;
    sortOrder?: number;
    locale?: string;
  } = {}
) {
  const title = data.title ?? `Test Song ${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const res = await request.post(apiUrl('/api/songs'), {
    data: {
      title,
      lyrics: data.lyrics ?? 'Test song lyrics line 1\nTest song lyrics line 2',
      sortOrder: data.sortOrder,
      locale: data.locale ?? 'he',
    },
    headers: authHeaders(token),
  });
  if (!res.ok()) throw new Error(`createSong failed: ${res.status()} ${await res.text()}`);
  return res.json();
}

export async function deleteSong(request: APIRequestContext, token: string, id: number) {
  const res = await request.delete(apiUrl(`/api/songs/${id}`), {
    headers: authHeaders(token),
  });
  if (!res.ok() && res.status() !== 204) {
    throw new Error(`deleteSong failed: ${res.status()} ${await res.text()}`);
  }
}

// ---- Content ----
export async function upsertContent(
  request: APIRequestContext,
  token: string,
  key: string,
  value: string,
  locale = 'he'
) {
  const res = await request.put(apiUrl('/api/content'), {
    data: { key, value, locale },
    headers: authHeaders(token),
  });
  if (!res.ok()) throw new Error(`upsertContent failed: ${res.status()} ${await res.text()}`);
  return res.json();
}

// ---- Auth ----
export async function getAdminToken(request: APIRequestContext): Promise<string> {
  const password = process.env.ADMIN_PASSWORD ?? 'admin123';
  const res = await request.post(apiUrl('/api/auth/login'), {
    data: { password },
  });
  if (!res.ok()) throw new Error(`getAdminToken failed: ${res.status()} ${await res.text()}`);
  const { token } = await res.json();
  return token;
}
