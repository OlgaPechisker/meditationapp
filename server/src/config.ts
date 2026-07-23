import { config as loadEnv } from "dotenv";
import bcrypt from "bcrypt";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { ConfigurationError } from "./errors/configuration-error.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(currentDir, "../.env") });
loadEnv({ path: resolve(currentDir, "../../.env") });

const bcryptHashPattern = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const knownDevelopmentPasswords = ["admin123", "test-password", "password"];

function parseAllowedOrigins(value: string): string[] {
  const origins = new Set<string>();

  for (const configuredOrigin of value.split(",")) {
    const origin = configuredOrigin.trim();

    if (!origin) {
      throw new ConfigurationError(["ALLOWED_ORIGINS"]);
    }

    try {
      const url = new URL(origin);
      if (
        !/^https?:\/\//i.test(origin) ||
        origin.includes("?") ||
        origin.includes("#") ||
        !["http:", "https:"].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.pathname !== "/" ||
        url.search ||
        url.hash ||
        url.origin === "null"
      ) {
        throw new Error("Invalid origin");
      }

      origins.add(url.origin);
    } catch {
      throw new ConfigurationError(["ALLOWED_ORIGINS"]);
    }
  }

  return [...origins];
}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().trim().min(1),
  JWT_AUDIENCE: z.string().trim().min(1),
  ADMIN_PASSWORD_HASH: z.string().regex(bcryptHashPattern).optional(),
  ADMIN_PASSWORD: z.string().optional(),
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  STORAGE_PROVIDER: z.enum(["local"]).default("local"),
  UPLOAD_DIR: z.string().min(1).default("./uploads"),
  MAX_FILE_SIZE_MB: z.coerce.number().int().min(1).max(25).default(5),
  RATE_LIMIT_MAX_BUCKETS: z.coerce.number().int().min(1).max(100_000).default(10_000),
  BASE_URL: z.url().default("http://localhost:3000"),
  ALLOWED_ORIGINS: z.string().trim().min(1).optional(),
  HTTPS_TERMINATION: z.enum(["true", "false"]).default("false"),
}).superRefine((env, ctx) => {
  if (!env.ADMIN_PASSWORD_HASH && !env.ADMIN_PASSWORD) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Either ADMIN_PASSWORD_HASH or ADMIN_PASSWORD is required",
      path: ["ADMIN_PASSWORD_HASH"],
    });
  }

  if (env.NODE_ENV === "production") {
    if (!env.ALLOWED_ORIGINS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ALLOWED_ORIGINS is required in production",
        path: ["ALLOWED_ORIGINS"],
      });
    }

    if (!env.ADMIN_PASSWORD_HASH) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ADMIN_PASSWORD_HASH is required in production",
        path: ["ADMIN_PASSWORD_HASH"],
      });
    }

    if (env.ADMIN_PASSWORD) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ADMIN_PASSWORD is not allowed in production",
        path: ["ADMIN_PASSWORD"],
      });
    }

    const passwordHash = env.ADMIN_PASSWORD_HASH;
    if (passwordHash && knownDevelopmentPasswords.some((password) => bcrypt.compareSync(password, passwordHash))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ADMIN_PASSWORD_HASH must not use a known development password",
        path: ["ADMIN_PASSWORD_HASH"],
      });
    }
  }
});

const environment = envSchema.safeParse(process.env);
if (!environment.success) {
  throw new ConfigurationError(
    [...new Set(environment.error.issues.map((issue) => issue.path.map(String).join(".") || "environment"))],
  );
}

const parsedEnv = environment.data;
const allowedOrigins = parsedEnv.ALLOWED_ORIGINS
  ? parseAllowedOrigins(parsedEnv.ALLOWED_ORIGINS)
  : [];

export const config = {
  DATABASE_URL: parsedEnv.DATABASE_URL,
  JWT_SECRET: parsedEnv.JWT_SECRET,
  JWT_ISSUER: parsedEnv.JWT_ISSUER,
  JWT_AUDIENCE: parsedEnv.JWT_AUDIENCE,
  ADMIN_PASSWORD_HASH:
    parsedEnv.ADMIN_PASSWORD_HASH ??
    bcrypt.hashSync(parsedEnv.ADMIN_PASSWORD as string, 12),
  PORT: parsedEnv.PORT,
  RATE_LIMIT_MAX_BUCKETS: parsedEnv.RATE_LIMIT_MAX_BUCKETS,
  ALLOWED_ORIGINS: allowedOrigins,
  HSTS_ENABLED: parsedEnv.NODE_ENV === "production" && parsedEnv.HTTPS_TERMINATION === "true",
};

export const uploadConfig = {
  STORAGE_PROVIDER: parsedEnv.STORAGE_PROVIDER,
  UPLOAD_DIR: parsedEnv.UPLOAD_DIR,
  MAX_FILE_SIZE_MB: parsedEnv.MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_BYTES: parsedEnv.MAX_FILE_SIZE_MB * 1024 * 1024,
  BASE_URL: parsedEnv.BASE_URL,
};
