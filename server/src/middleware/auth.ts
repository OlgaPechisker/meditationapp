import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { UnauthorizedError } from "../errors/application-error.js";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new UnauthorizedError());
    return;
  }

  try {
    const token = header.slice(7);
    jwt.verify(token, config.JWT_SECRET);
    req.actor = { type: "admin" };
    next();
  } catch {
    next(new UnauthorizedError("Invalid authentication token"));
  }
}
