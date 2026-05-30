import { Request, Response, NextFunction } from "express";

const store = new Map<string, { count: number; resetAt: number }>();

export function clearRateLimitStore() {
  store.clear();
}

export function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const raw = req.ip || req.socket.remoteAddress || "unknown";
    // Normalise loopback variants so all localhost clients share one bucket.
    const ip = raw.replace(/^::ffff:/, "").replace("::1", "127.0.0.1");
    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (entry.count >= maxRequests) {
      res.status(429).json({ error: "Too many requests" });
      return;
    }

    entry.count++;
    next();
  };
}
