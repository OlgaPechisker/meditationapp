import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { UnauthorizedError } from "../errors/application-error.js";
import { emitRejectedToken } from "./security-events.js";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new UnauthorizedError());
    return;
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, config.JWT_SECRET, {
      algorithms: ["HS256"],
      audience: config.JWT_AUDIENCE,
      issuer: config.JWT_ISSUER,
    });
    if (typeof payload === "string" || payload.role !== "admin") {
      throw new UnauthorizedError();
    }
    req.actor = { type: "admin" };
    next();
  } catch {
    emitRejectedToken(req);
    next(new UnauthorizedError());
  }
}
