import { Request, Response, NextFunction } from "express";
import { RateLimitedError } from "../errors/application-error.js";

const store = new Map<string, { count: number; resetAt: number }>();

export function clearRateLimitStore() {
  store.clear();
}

function setRateLimitHeaders(
  res: Response,
  maxRequests: number,
  remaining: number,
  resetAt: number,
  windowMs: number,
  now: number,
) {
  const resetInSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));
  res.set({
    "RateLimit-Limit": String(maxRequests),
    "RateLimit-Policy": `${maxRequests};w=${Math.ceil(windowMs / 1000)}`,
    "RateLimit-Remaining": String(Math.max(0, remaining)),
    "RateLimit-Reset": String(resetInSeconds),
  });
  return resetInSeconds;
}

export function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const raw = req.ip || req.socket.remoteAddress || "unknown";
    // Normalise loopback variants so all localhost clients share one bucket.
    const ip = raw.replace(/^::ffff:/, "").replace("::1", "127.0.0.1");
    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
      const resetAt = now + windowMs;
      store.set(ip, { count: 1, resetAt });
      setRateLimitHeaders(res, maxRequests, maxRequests - 1, resetAt, windowMs, now);
      next();
      return;
    }

    if (entry.count >= maxRequests) {
      const retryAfter = setRateLimitHeaders(res, maxRequests, 0, entry.resetAt, windowMs, now);
      res.set("Retry-After", String(retryAfter));
      next(new RateLimitedError());
      return;
    }

    entry.count++;
    setRateLimitHeaders(res, maxRequests, maxRequests - entry.count, entry.resetAt, windowMs, now);
    next();
  };
}
