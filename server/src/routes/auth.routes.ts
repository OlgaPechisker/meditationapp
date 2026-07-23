import { Router, Request, Response } from "express";
import { z } from "zod";
import { login } from "../services/auth.service.js";
import { UnauthorizedError } from "../errors/application-error.js";

export const authRoutes = Router();

const loginSchema = z.object({ password: z.string().min(1) });

authRoutes.post("/login", async (req: Request, res: Response) => {
  const { password } = loginSchema.parse(req.body);
  const token = await login(password);
  if (!token) throw new UnauthorizedError("Invalid credentials");
  res.json({ token });
});
