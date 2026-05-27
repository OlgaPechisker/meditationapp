import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";

describe("Health", () => {
  it("GET /api/health returns ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("Treatments API", () => {
  it("GET /api/treatments returns paginated list", async () => {
    const res = await request(app).get("/api/treatments?locale=he");
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.meta).toHaveProperty("total");
  });

  it("GET /api/treatments/:slug returns treatment", async () => {
    const res = await request(app).get("/api/treatments/healing?locale=he");
    expect(res.status).toBe(200);
    expect(res.body.title).toBeDefined();
  });

  it("GET /api/treatments/:slug returns 404 for missing", async () => {
    const res = await request(app).get("/api/treatments/nonexistent?locale=he");
    expect(res.status).toBe(404);
  });
});

describe("Blog API", () => {
  it("GET /api/blog returns published posts", async () => {
    const res = await request(app).get("/api/blog?locale=he");
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it("GET /api/blog/:slug returns post", async () => {
    const res = await request(app).get("/api/blog/welcome?locale=he");
    expect(res.status).toBe(200);
    expect(res.body.title).toBeDefined();
  });
});

describe("Lectures API", () => {
  it("GET /api/lectures returns list", async () => {
    const res = await request(app).get("/api/lectures?locale=he");
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });
});

describe("Songs API", () => {
  it("GET /api/songs returns list", async () => {
    const res = await request(app).get("/api/songs?locale=he");
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

describe("Content API", () => {
  it("GET /api/content/:key returns content", async () => {
    const res = await request(app).get("/api/content/about?locale=he");
    expect(res.status).toBe(200);
    expect(res.body.key).toBe("about");
  });

  it("GET /api/content returns all content", async () => {
    const res = await request(app).get("/api/content?locale=he");
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
  });
});

describe("Auth API", () => {
  it("POST /api/auth/login returns 401 with wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({ password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("POST /api/auth/login returns 400 without password", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
  });
});
