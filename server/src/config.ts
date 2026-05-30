import { config as loadEnv } from "dotenv";
import bcrypt from "bcrypt";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const currentDir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(currentDir, "../.env") });
loadEnv({ path: resolve(currentDir, "../../.env") });

const envSchema = z.object({
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(10),
  ADMIN_PASSWORD_HASH: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  PORT: z.coerce.number().default(3000),
  STORAGE_PROVIDER: z.enum(["local"]).default("local"),
  UPLOAD_DIR: z.string().default("./uploads"),
  MAX_FILE_SIZE_MB: z.coerce.number().default(5),
  BASE_URL: z.string().default("http://localhost:3000"),
}).superRefine((env, ctx) => {
  if (!env.ADMIN_PASSWORD_HASH && !env.ADMIN_PASSWORD) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Either ADMIN_PASSWORD_HASH or ADMIN_PASSWORD is required",
      path: ["ADMIN_PASSWORD_HASH"],
    });
  }
});

const parsedEnv = envSchema.parse(process.env);

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
