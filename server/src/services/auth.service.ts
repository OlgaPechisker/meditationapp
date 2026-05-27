import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "../config.js";

export async function login(password: string): Promise<string | null> {
  const valid = await bcrypt.compare(password, config.ADMIN_PASSWORD_HASH);
  if (!valid) return null;
  return jwt.sign({ role: "admin" }, config.JWT_SECRET, { expiresIn: "24h" });
}
