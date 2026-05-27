import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(10),
  ADMIN_PASSWORD_HASH: z.string(),
  PORT: z.coerce.number().default(3000),
});

export const config = envSchema.parse(process.env);
