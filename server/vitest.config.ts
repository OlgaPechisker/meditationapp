import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: "postgresql://einat:einat@localhost:5432/einat_dev",
      JWT_SECRET: "dev-secret-change-me",
      ADMIN_PASSWORD_HASH: "$2b$10$placeholder",
      PORT: "3000",
    },
  },
});
