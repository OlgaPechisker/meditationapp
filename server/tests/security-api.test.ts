import jwt, { type JwtPayload } from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/index.js";
import { config } from "../src/config.js";
import { clearRateLimitStore } from "../src/middleware/rate-limit.js";
import { prisma } from "../src/prisma.js";

const LOCALE = "en";
let sequence = 0;
let token = "";

function uniqueSlug(prefix: string) {
  sequence += 1;
  return `${prefix}-${process.pid}-${sequence}`;
}

function auth() {
  return { Authorization: `Bearer ${token}` };
}

async function createTreatment(isActive: boolean) {
  const response = await request(app)
    .post("/api/treatments")
    .set(auth())
    .send({
      slug: uniqueSlug(isActive ? "visible-treatment" : "hidden-treatment"),
      locale: LOCALE,
      title: "Treatment",
      description: "<p>Safe treatment description</p>",
      isActive,
    });
  expect(response.status).toBe(201);
  return response.body as { id: number; slug: string };
}

async function createBlogPost(input: { publishedAt?: string; title?: string } = {}) {
  const response = await request(app)
    .post("/api/blog")
    .set(auth())
    .send({
      slug: uniqueSlug("security-post"),
      locale: LOCALE,
      title: input.title ?? "Visible post",
      content: "<p>Safe post content</p>",
      ...input,
    });
  expect(response.status).toBe(201);
  return response.body as { id: number; slug: string };
}

async function createLecture(input: Record<string, unknown>) {
  const response = await request(app)
    .post("/api/lectures")
    .set(auth())
    .send({
      slug: uniqueSlug("security-lecture"),
      locale: LOCALE,
      title: "Security lecture",
      description: "<p>Safe lecture description</p>",
      location: "Online",
      ...input,
    });
  expect(response.status).toBe(201);
  return response.body as { id: number; slug: string };
}

function expectGenericUnauthorized(response: request.Response) {
  expect(response.status).toBe(401);
  expect(response.body).toMatchObject({
    code: "UNAUTHORIZED",
    message: "Authentication required",
  });
  expect(response.body.requestId).toEqual(expect.any(String));
  expect(response.body).not.toHaveProperty("details");
}

beforeAll(async () => {
  clearRateLimitStore();
  const response = await request(app).post("/api/auth/login").send({ password: "test-password" });
  expect(response.status).toBe(200);
  token = response.body.token;
});

beforeEach(() => {
  clearRateLimitStore();
});

afterAll(async () => {
  clearRateLimitStore();
  await prisma.comment.deleteMany({ where: { post: { locale: LOCALE } } });
  await prisma.blogPost.deleteMany({ where: { locale: LOCALE } });
  await prisma.treatment.deleteMany({ where: { locale: LOCALE } });
  await prisma.lecture.deleteMany({ where: { locale: LOCALE } });
  await prisma.siteContent.deleteMany({ where: { locale: LOCALE } });
});

describe("public visibility and admin retention", () => {
  it("hides inactive treatments and unpublished, future, and deleted posts while retaining intended admin records", async () => {
    const activeTreatment = await createTreatment(true);
    const inactiveTreatment = await createTreatment(false);
    const currentPost = await createBlogPost({ publishedAt: "2020-01-01T00:00:00.000Z" });
    const draftPost = await createBlogPost();
    const futurePost = await createBlogPost({ publishedAt: "2099-01-01T00:00:00.000Z" });
    const deletedPost = await createBlogPost({ publishedAt: "2020-01-01T00:00:00.000Z" });
    expect((await request(app).delete(`/api/blog/${deletedPost.id}`).set(auth())).status).toBe(204);

    expect((await request(app).get(`/api/treatments/${activeTreatment.slug}?locale=${LOCALE}`)).status).toBe(200);
    expect((await request(app).get(`/api/treatments/${inactiveTreatment.slug}?locale=${LOCALE}`)).status).toBe(404);
    expect((await request(app).get(`/api/blog/${currentPost.slug}?locale=${LOCALE}`)).status).toBe(200);
    for (const post of [draftPost, futurePost, deletedPost]) {
      expect((await request(app).get(`/api/blog/${post.slug}?locale=${LOCALE}`)).status).toBe(404);
    }

    const treatments = await request(app).get(`/api/treatments/admin/all?locale=${LOCALE}`).set(auth());
    expect(treatments.body.data.map((item: { id: number }) => item.id)).toContain(inactiveTreatment.id);

    const posts = await request(app).get(`/api/blog/admin/all?locale=${LOCALE}`).set(auth());
    const postIds = posts.body.data.map((item: { id: number }) => item.id);
    expect(postIds).toEqual(expect.arrayContaining([currentPost.id, draftPost.id, futurePost.id]));
    expect(postIds).not.toContain(deletedPost.id);
  });

  it("keeps public lecture visibility rules while retaining hidden lectures for admins", async () => {
    const onDemand = await createLecture({ type: "ON_DEMAND", minimumParticipants: 1 });
    const inactive = await createLecture({
      type: "SCHEDULED",
      date: "2099-01-01T00:00:00.000Z",
      isActive: false,
    });
    const past = await createLecture({
      type: "SCHEDULED",
      date: "2020-01-01T00:00:00.000Z",
    });

    expect((await request(app).get(`/api/lectures/${onDemand.slug}?locale=${LOCALE}`)).status).toBe(200);
    expect((await request(app).get(`/api/lectures/${inactive.slug}?locale=${LOCALE}`)).status).toBe(404);
    expect((await request(app).get(`/api/lectures/${past.slug}?locale=${LOCALE}`)).status).toBe(404);

    const admin = await request(app).get(`/api/lectures/admin/all?locale=${LOCALE}`).set(auth());
    expect(admin.body.data.map((item: { id: number }) => item.id)).toEqual(
      expect.arrayContaining([onDemand.id, inactive.id, past.id]),
    );
  });
});

describe("authentication", () => {
  it("issues an HS256 admin token with exactly two-hour metadata and required claims", async () => {
    const login = await request(app).post("/api/auth/login").send({ password: "test-password" });
    expect(login.status).toBe(200);

    const decoded = jwt.decode(login.body.token) as JwtPayload;
    const header = jwt.decode(login.body.token, { complete: true })?.header;
    expect(header).toMatchObject({ alg: "HS256" });
    expect(decoded).toMatchObject({
      role: "admin",
      iss: config.JWT_ISSUER,
      aud: config.JWT_AUDIENCE,
    });
    expect(decoded.exp).toEqual(expect.any(Number));
    expect(decoded.iat).toEqual(expect.any(Number));
    expect((decoded.exp as number) - (decoded.iat as number)).toBe(2 * 60 * 60);
  });

  it("returns the same generic 401 for expired, altered, wrong-issuer, wrong-audience, and unsupported tokens", async () => {
    const sign = (
      payload: object,
      options: jwt.SignOptions = {},
      secret = config.JWT_SECRET,
    ) => jwt.sign(payload, secret, {
      algorithm: "HS256",
      issuer: config.JWT_ISSUER,
      audience: config.JWT_AUDIENCE,
      ...options,
    });
    const valid = sign({ role: "admin" });
    const [header, payload, signature] = valid.split(".");
    const altered = `${header}.${payload}.${signature.startsWith("a") ? "b" : "a"}${signature.slice(1)}`;
    const cases = [
      sign({ role: "admin" }, { expiresIn: -1 }),
      altered,
      sign({ role: "admin" }, { issuer: "wrong-issuer" }),
      sign({ role: "admin" }, { audience: "wrong-audience" }),
      jwt.sign({ role: "admin" }, config.JWT_SECRET, {
        algorithm: "HS384",
        issuer: config.JWT_ISSUER,
        audience: config.JWT_AUDIENCE,
      }),
    ];

    for (const invalidToken of cases) {
      const response = await request(app)
        .get(`/api/treatments/admin/all?locale=${LOCALE}`)
        .set("Authorization", `Bearer ${invalidToken}`);
      expectGenericUnauthorized(response);
    }
  });
});

describe("browser security behavior", () => {
  it("allows configured origins, rejects unconfigured origins, and permits same-origin requests", async () => {
    const allowed = await request(app).get("/api/health").set("Origin", "https://allowed.test.example");
    expect(allowed.status).toBe(200);
    expect(allowed.headers["access-control-allow-origin"]).toBe("https://allowed.test.example");
    expect(allowed.headers["access-control-allow-credentials"]).toBeUndefined();

    const disallowed = await request(app).get("/api/health").set("Origin", "https://blocked.test.example");
    expect(disallowed.status).toBe(200);
    expect(disallowed.headers["access-control-allow-origin"]).toBeUndefined();
    expect(disallowed.headers["access-control-allow-credentials"]).toBeUndefined();

    const noOrigin = await request(app).get("/api/health");
    expect(noOrigin.status).toBe(200);
    expect(noOrigin.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("declares explicit preflight methods and Authorization while sending baseline security headers", async () => {
    const preflight = await request(app)
      .options("/api/blog")
      .set("Origin", "https://allowed.test.example")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "Authorization, Content-Type");
    expect(preflight.status).toBe(204);
    expect(preflight.headers["access-control-allow-methods"]).toBe("GET,HEAD,POST,PUT,PATCH,DELETE");
    expect(preflight.headers["access-control-allow-headers"]).toContain("Authorization");
    expect(preflight.headers["access-control-allow-credentials"]).toBeUndefined();

    const response = await request(app).get("/api/health");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-powered-by"]).toBeUndefined();
    expect(response.headers["strict-transport-security"]).toBeUndefined();
  });
});

describe("login and authored content safeguards", () => {
  it("throttles login separately from comment creation and returns rate-limit metadata", async () => {
    const post = await prisma.blogPost.create({
      data: {
        slug: uniqueSlug("comment-target"),
        locale: LOCALE,
        title: "Comment target",
        content: "<p>Comment target</p>",
        publishedAt: new Date("2020-01-01T00:00:00.000Z"),
      },
    });
    const client = { "X-Forwarded-For": "198.51.100.80" };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await request(app).post("/api/auth/login").set(client).send({ password: "incorrect" })).status).toBe(401);
    }
    const throttled = await request(app).post("/api/auth/login").set(client).send({ password: "incorrect" });
    expect(throttled.status).toBe(429);
    expect(throttled.headers).toMatchObject({
      "ratelimit-limit": "5",
      "ratelimit-policy": "5;w=900",
      "ratelimit-remaining": "0",
      "retry-after": expect.any(String),
    });

    const comment = await request(app).post("/api/comments").set(client).send({
      postId: post.id,
      authorName: "Commenter",
      content: "A separate limiter namespace",
    });
    expect(comment.status).toBe(201);
  });

  it("trims comments, persists literal HTML as text, and rejects control characters", async () => {
    const post = await prisma.blogPost.create({
      data: {
        slug: uniqueSlug("comment-content"),
        locale: LOCALE,
        title: "Comment content target",
        content: "<p>Comment target</p>",
        publishedAt: new Date("2020-01-01T00:00:00.000Z"),
      },
    });
    const literal = "  <img src=x onerror=alert(1)> plain text  ";
    const response = await request(app).post("/api/comments").send({
      postId: post.id,
      authorName: "  <b>Visitor</b>  ",
      content: literal,
    });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      authorName: "<b>Visitor</b>",
      content: "<img src=x onerror=alert(1)> plain text",
    });

    const controlCharacter = await request(app).post("/api/comments").send({
      postId: post.id,
      authorName: "Visitor",
      content: "invalid\u0000comment",
    });
    expect(controlCharacter.status).toBe(400);
  });

  it("enforces each SiteContent classification and filters unknown persisted keys", async () => {
    const put = (key: string, value: string) => request(app)
      .put("/api/content")
      .set(auth())
      .send({ key, locale: LOCALE, value });

    const richHtml = await put("about", '<p onclick="alert(1)">Safe</p><script>bad()</script>');
    expect(richHtml.status).toBe(200);
    expect(richHtml.body.value).toBe("<p>Safe</p>");

    expect((await put("about_title", "  About Einat  ")).body.value).toBe("About Einat");
    expect((await put("contact_phone", "  +972 50 123 4567  ")).body.value).toBe("+972 50 123 4567");
    expect((await put("contact_email", "  hello@example.com  ")).body.value).toBe("hello@example.com");
    expect((await put("about_image", "/uploads/verified-image.jpg")).body.value).toBe("/uploads/verified-image.jpg");

    expect((await put("about_title", "x".repeat(201))).status).toBe(400);
    for (const unsafeUrl of [
      "/uploads/../private.jpg",
      "/uploads/%252e%252e/private.jpg",
      "/uploads/%2fprivate.jpg",
      "javascript:alert(1)",
    ]) {
      expect((await put("about_image", unsafeUrl)).status).toBe(400);
    }

    expect((await put("unrecognized_key", "value")).status).toBe(400);
    expect((await request(app).get(`/api/content/unrecognized_key?locale=${LOCALE}`)).status).toBe(404);

    await prisma.siteContent.create({ data: { key: "unrecognized_key", locale: LOCALE, value: "hidden" } });
    const publicContent = await request(app).get(`/api/content?locale=${LOCALE}`);
    const adminContent = await request(app).get(`/api/content/admin/all?locale=${LOCALE}`).set(auth());
    for (const response of [publicContent, adminContent]) {
      const entries = Array.isArray(response.body) ? response.body : response.body.data;
      expect(entries.map((entry: { key: string }) => entry.key)).not.toContain("unrecognized_key");
    }
  });
});
