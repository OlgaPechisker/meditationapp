import { config as loadEnv } from "dotenv";
import bcrypt from "bcrypt";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { ConfigurationError } from "./errors/configuration-error.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(currentDir, "../.env") });
loadEnv({ path: resolve(currentDir, "../../.env") });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(10),
  ADMIN_PASSWORD_HASH: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
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
  ADMIN_PASSWORD_HASH:
    parsedEnv.ADMIN_PASSWORD_HASH ??
    bcrypt.hashSync(parsedEnv.ADMIN_PASSWORD as string, 10),
  PORT: parsedEnv.PORT,
};

export const uploadConfig = {
  STORAGE_PROVIDER: parsedEnv.STORAGE_PROVIDER,
  UPLOAD_DIR: parsedEnv.UPLOAD_DIR,
  MAX_FILE_SIZE_MB: parsedEnv.MAX_FILE_SIZE_MB,
  BASE_URL: parsedEnv.BASE_URL,
};
