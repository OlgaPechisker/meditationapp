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
  MAX_FILE_SIZE_MB: z.coerce.number().positive().finite().default(5),
  BASE_URL: z.url().default("http://localhost:3000"),
}).superRefine((env, ctx) => {
  if (!env.ADMIN_PASSWORD_HASH && !env.ADMIN_PASSWORD) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Either ADMIN_PASSWORD_HASH or ADMIN_PASSWORD is required",
      path: ["ADMIN_PASSWORD_HASH"],
    });
  }

  if (env.NODE_ENV === "production") {
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

export const config = {
  DATABASE_URL: parsedEnv.DATABASE_URL,
  JWT_SECRET: parsedEnv.JWT_SECRET,
  JWT_ISSUER: parsedEnv.JWT_ISSUER,
  JWT_AUDIENCE: parsedEnv.JWT_AUDIENCE,
  ADMIN_PASSWORD_HASH:
    parsedEnv.ADMIN_PASSWORD_HASH ??
    bcrypt.hashSync(parsedEnv.ADMIN_PASSWORD as string, 12),
  PORT: parsedEnv.PORT,
};

export const uploadConfig = {
  STORAGE_PROVIDER: parsedEnv.STORAGE_PROVIDER,
  UPLOAD_DIR: parsedEnv.UPLOAD_DIR,
  MAX_FILE_SIZE_MB: parsedEnv.MAX_FILE_SIZE_MB,
  BASE_URL: parsedEnv.BASE_URL,
};
