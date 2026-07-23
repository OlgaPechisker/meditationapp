import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { config } from "../src/config.js";
import { RateLimitedError } from "../src/errors/application-error.js";
import { clearRateLimitStore, rateLimit } from "../src/middleware/rate-limit.js";

function limiterApp() {
  const app = express();
  app.set("trust proxy", 1);

  app.get("/ip", (req, res) => res.json({ ip: req.ip }));
  app.get("/limited", rateLimit("limited", 2, 60_000), (_req, res) => res.status(204).end());
  app.get("/route-a", rateLimit("route-a", 1, 60_000), (_req, res) => res.status(204).end());
  app.get("/route-b", rateLimit("route-b", 1, 60_000), (_req, res) => res.status(204).end());
  app.post("/login", rateLimit("auth.login", 5, 60_000), (_req, res) => res.status(204).end());
  app.post("/comments", rateLimit("comments.create", 3, 60_000), (_req, res) => res.status(204).end());
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof RateLimitedError) {
      res.status(error.status).json({ code: error.code });
      return;
    }
    throw error;
  });

  return app;
}

beforeEach(() => {
  clearRateLimitStore();
});

afterEach(() => {
  clearRateLimitStore();
  vi.useRealTimers();
});

describe("rate limiting", () => {
  it("trusts exactly one proxy and derives the forwarded client address", async () => {
    const app = limiterApp();

    expect(app.get("trust proxy")).toBe(1);
    const singleProxy = await request(app).get("/ip").set("X-Forwarded-For", "198.51.100.20");
    const proxyChain = await request(app).get("/ip").set("X-Forwarded-For", "198.51.100.20, 10.0.0.9");

    expect(singleProxy.body.ip).toBe("198.51.100.20");
    expect(proxyChain.body.ip).toBe("10.0.0.9");
  });

  it("emits standard rate-limit metadata and Retry-After when throttled", async () => {
    const app = limiterApp();
    const client = { "X-Forwarded-For": "198.51.100.30" };

    const first = await request(app).get("/limited").set(client);
    expect(first.status).toBe(204);
    expect(first.headers).toMatchObject({
      "ratelimit-limit": "2",
      "ratelimit-policy": "2;w=60",
      "ratelimit-remaining": "1",
      "ratelimit-reset": "60",
    });
    expect(first.headers["retry-after"]).toBeUndefined();

    const second = await request(app).get("/limited").set(client);
    expect(second.status).toBe(204);
    expect(second.headers["ratelimit-remaining"]).toBe("0");

    const throttled = await request(app).get("/limited").set(client);
    expect(throttled.status).toBe(429);
    expect(throttled.headers).toMatchObject({
      "ratelimit-limit": "2",
      "ratelimit-remaining": "0",
      "retry-after": "60",
    });
  });

  it("keeps different clients and route namespaces independent", async () => {
    const app = limiterApp();

    expect((await request(app).get("/route-a").set("X-Forwarded-For", "198.51.100.40")).status).toBe(204);
    expect((await request(app).get("/route-a").set("X-Forwarded-For", "198.51.100.40")).status).toBe(429);
    expect((await request(app).get("/route-a").set("X-Forwarded-For", "198.51.100.41")).status).toBe(204);

    clearRateLimitStore();
    expect((await request(app).get("/route-b").set("X-Forwarded-For", "198.51.100.40")).status).toBe(204);
  });

  it("expires windows and lets the clear helper reset active buckets", async () => {
    vi.useFakeTimers({ now: new Date("2026-01-01T00:00:00.000Z") });
    const app = limiterApp();
    const client = { "X-Forwarded-For": "198.51.100.50" };

    expect((await request(app).get("/route-a").set(client)).status).toBe(204);
    expect((await request(app).get("/route-a").set(client)).status).toBe(429);

    clearRateLimitStore();
    expect((await request(app).get("/route-a").set(client)).status).toBe(204);

    vi.setSystemTime(new Date("2026-01-01T00:01:00.000Z"));
    expect((await request(app).get("/route-a").set(client)).status).toBe(204);
  });

  it("preserves active buckets when its configured capacity is reached", async () => {
    const app = limiterApp();

    const activeBuckets = await Promise.all(
      Array.from({ length: config.RATE_LIMIT_MAX_BUCKETS }, (_, index) =>
        request(app).get("/route-a").set("X-Forwarded-For", `198.51.100.${index + 1}`),
      ),
    );
    expect(activeBuckets.every((response) => response.status === 204)).toBe(true);

    const overflow = await request(app).get("/route-a").set("X-Forwarded-For", "198.51.100.200");
    expect(overflow.status).toBe(429);
    expect(overflow.headers["retry-after"]).toBe("60");
    expect((await request(app).get("/route-a").set("X-Forwarded-For", "198.51.100.1")).status).toBe(429);
  });

  it("keeps login and comment buckets separate", async () => {
    const app = limiterApp();
    const client = { "X-Forwarded-For": "198.51.100.70" };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await request(app).post("/login").set(client)).status).toBe(204);
    }
    expect((await request(app).post("/login").set(client)).status).toBe(429);
    expect((await request(app).post("/comments").set(client)).status).toBe(204);
  });
});
