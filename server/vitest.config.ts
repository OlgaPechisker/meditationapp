import { defineConfig } from "vitest/config";

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://einat:einat@localhost:5432/einat_dev";

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: databaseUrl,
      JWT_SECRET: "test-only-jwt-secret-that-is-at-least-32-characters",
      JWT_ISSUER: "einat-test-suite",
      JWT_AUDIENCE: "einat-test-admin",
      ADMIN_PASSWORD: "test-password",
      ALLOWED_ORIGINS: "https://allowed.test.example",
      RATE_LIMIT_MAX_BUCKETS: "100",
      UPLOAD_DIR: "./uploads-test",
      BASE_URL: "http://localhost:3000",
      PORT: "3000",
    },
  },
});
