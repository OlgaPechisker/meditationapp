import { Router, Request, Response } from "express";
import { z } from "zod";
import { login } from "../services/auth.service.js";

export const authRoutes = Router();

const loginSchema = z.object({ password: z.string().min(1) });

authRoutes.post("/login", async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Password required" }); return; }
  const token = await login(parsed.data.password);
  if (!token) { res.status(401).json({ error: "Invalid password" }); return; }
  res.json({ token });
});
