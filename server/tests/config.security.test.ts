import bcrypt from "bcrypt";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

const configurationKeys = [
  "DATABASE_URL",
  "JWT_SECRET",
  "JWT_ISSUER",
  "JWT_AUDIENCE",
  "ADMIN_PASSWORD",
  "ADMIN_PASSWORD_HASH",
  "ALLOWED_ORIGINS",
  "NODE_ENV",
  "HTTPS_TERMINATION",
  "RATE_LIMIT_MAX_BUCKETS",
  "UPLOAD_DIR",
  "BASE_URL",
] as const;

const validDevelopmentEnvironment: Record<(typeof configurationKeys)[number], string | undefined> = {
  DATABASE_URL: "postgresql://test:test@localhost:5432/einat_test",
  JWT_SECRET: "test-only-jwt-secret-that-is-at-least-32-characters",
  JWT_ISSUER: "einat-test-suite",
  JWT_AUDIENCE: "einat-test-admin",
  ADMIN_PASSWORD: "test-password",
  ADMIN_PASSWORD_HASH: undefined,
  ALLOWED_ORIGINS: "https://allowed.test.example",
  NODE_ENV: "development",
  HTTPS_TERMINATION: "false",
  RATE_LIMIT_MAX_BUCKETS: "2",
  UPLOAD_DIR: "./uploads-test",
  BASE_URL: "http://localhost:3000",
};

async function loadConfig(
  overrides: Partial<Record<(typeof configurationKeys)[number], string | undefined>> = {},
) {
  const previous = Object.fromEntries(configurationKeys.map((key) => [key, process.env[key]]));
  vi.resetModules();
  vi.doMock("../src/middleware/security-events.js", () => ({
    emitConfigurationFailure: vi.fn(),
    emitFailedLogin: vi.fn(),
    emitRateLimitedLogin: vi.fn(),
    emitSuccessfulLogin: vi.fn(),
    emitRejectedToken: vi.fn(),
    emitAdminMutation: vi.fn(),
    emitRejectedUpload: vi.fn(),
  }));
  vi.doMock("dotenv", () => ({
    config: vi.fn(),
  }));

  for (const key of configurationKeys) {
    const value = Object.hasOwn(overrides, key)
      ? overrides[key]
      : validDevelopmentEnvironment[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return await import("../src/config.js");
  } finally {
    for (const key of configurationKeys) {
      const value = previous[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

afterEach(() => {
  vi.doUnmock("../src/middleware/security-events.js");
  vi.doUnmock("dotenv");
  vi.resetModules();
});

describe("security configuration", () => {
  it("rejects JWT secrets shorter than 32 characters", async () => {
    await expect(loadConfig({ JWT_SECRET: "too-short" })).rejects.toMatchObject({
      name: "ConfigurationError",
      fields: expect.arrayContaining(["JWT_SECRET"]),
    });
  });

  it("requires a password hash and rejects default development credentials in production", async () => {
    await expect(loadConfig({
      NODE_ENV: "production",
      ADMIN_PASSWORD: "admin123",
      ADMIN_PASSWORD_HASH: undefined,
    })).rejects.toMatchObject({
      name: "ConfigurationError",
      fields: expect.arrayContaining(["ADMIN_PASSWORD_HASH", "ADMIN_PASSWORD"]),
    });

    const defaultPasswordHash = await bcrypt.hash("test-password", 4);
    await expect(loadConfig({
      NODE_ENV: "production",
      ADMIN_PASSWORD: undefined,
      ADMIN_PASSWORD_HASH: defaultPasswordHash,
    })).rejects.toMatchObject({
      name: "ConfigurationError",
      fields: expect.arrayContaining(["ADMIN_PASSWORD_HASH"]),
    });
  });

  it("prefers a configured password hash outside production", async () => {
    const hash = await bcrypt.hash("a-non-default-test-password", 4);
    const { config } = await loadConfig({
      ADMIN_PASSWORD: "ignored-when-hash-is-present",
      ADMIN_PASSWORD_HASH: hash,
    });

    expect(config.ADMIN_PASSWORD_HASH).toBe(hash);
  });

  it("enables HSTS only for an explicitly HTTPS-terminated production deployment", async () => {
    const hash = await bcrypt.hash("a-non-default-production-password", 4);
    const productionEnvironment = {
      NODE_ENV: "production",
      ADMIN_PASSWORD: undefined,
      ADMIN_PASSWORD_HASH: hash,
    } as const;

    const { config: productionHttp } = await loadConfig({
      ...productionEnvironment,
      HTTPS_TERMINATION: "false",
    });
    expect(productionHttp.HSTS_ENABLED).toBe(false);
    const { app: productionHttpApp } = await import("../src/index.js");
    expect((await request(productionHttpApp).get("/api/health")).headers["strict-transport-security"]).toBeUndefined();

    const { config: productionHttps } = await loadConfig({
      ...productionEnvironment,
      HTTPS_TERMINATION: "true",
    });
    expect(productionHttps.HSTS_ENABLED).toBe(true);
    const { app: productionHttpsApp } = await import("../src/index.js");
    expect((await request(productionHttpsApp).get("/api/health")).headers["strict-transport-security"])
      .toMatch(/^max-age=/);
  });
});
