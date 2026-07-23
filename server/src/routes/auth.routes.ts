import { Router, Request, Response } from "express";
import { z } from "zod";
import { login } from "../services/auth.service.js";
import { UnauthorizedError } from "../errors/application-error.js";
import { rateLimit } from "../middleware/rate-limit.js";

export const authRoutes = Router();

const loginSchema = z.object({ password: z.string().min(1) });
const loginRateLimit = rateLimit(5, 15 * 60 * 1000);

authRoutes.post("/login", loginRateLimit, async (req: Request, res: Response) => {
  const { password } = loginSchema.parse(req.body);
  const token = await login(password);
  if (!token) throw new UnauthorizedError("Invalid credentials");
  res.json({ token });
});
