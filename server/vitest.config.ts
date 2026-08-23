import { defineConfig } from "vitest/config";

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://einat:einat@localhost:5432/einat_dev";

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: databaseUrl,
      JWT_SECRET: "dev-secret-change-me",
      ADMIN_PASSWORD: "test-password",
      PORT: "3000",
    },
  },
});
