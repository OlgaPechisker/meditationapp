import type { NextFunction, Request, RequestHandler, Response } from "express";
import { config } from "../config.js";
import { RateLimitedError } from "../errors/application-error.js";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

// The global cap preserves active buckets across namespaces; new keys are rejected when full.
const store = new Map<string, RateLimitBucket>();

export function clearRateLimitStore() {
  store.clear();
}

function normalizeClientIp(rawIp: string): string {
  const ip = rawIp.trim().toLowerCase();
  const normalizedIp = ip.replace(/^::ffff:/, "");

  return normalizedIp === "::1" || normalizedIp === "0:0:0:0:0:0:0:1"
    ? "127.0.0.1"
    : normalizedIp;
}

function evictExpiredBuckets(now: number): void {
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) {
      store.delete(key);
    }
  }
}

function earliestResetAt(): number | undefined {
  let earliest: number | undefined;

  for (const bucket of store.values()) {
    if (earliest === undefined || bucket.resetAt < earliest) {
      earliest = bucket.resetAt;
    }
  }

  return earliest;
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

export function rateLimit(identity: string, maxRequests: number, windowMs: number): RequestHandler {
  if (!identity.trim()) {
    throw new Error("Rate limit identity must not be empty");
  }
  if (!Number.isSafeInteger(maxRequests) || maxRequests < 1) {
    throw new Error("Rate limit maximum requests must be a positive safe integer");
  }
  if (!Number.isSafeInteger(windowMs) || windowMs < 1) {
    throw new Error("Rate limit window must be a positive safe integer");
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = normalizeClientIp(req.ip || req.socket.remoteAddress || "unknown");
    const key = `${identity}\u0000${ip}`;
    const now = Date.now();
    evictExpiredBuckets(now);
    const entry = store.get(key);

    if (!entry) {
      if (store.size >= config.RATE_LIMIT_MAX_BUCKETS) {
        // Keep active buckets intact so a flood of new client IPs cannot evict
        // established clients. New clients retry when the oldest bucket expires.
        const resetAt = earliestResetAt() ?? now + windowMs;
        const retryAfter = setRateLimitHeaders(res, maxRequests, 0, resetAt, windowMs, now);
        res.set("Retry-After", String(retryAfter));
        next(new RateLimitedError());
        return;
      }

      const resetAt = now + windowMs;
      store.set(key, { count: 1, resetAt });
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
