import { pinoHttp } from "pino-http";
import type { NextFunction, Request, Response } from "express";

const redactedPaths = [
  "req.headers.authorization",
  "req.headers.cookie",
  "req.headers.set-cookie",
  "req.body",
  "req.query",
  "req.file.buffer",
  "req.files.*.buffer",
  "err.headers.authorization",
  "err.headers.cookie",
  "err.body",
  "err.query",
  "err.password",
  "err.token",
  "err.jwt",
  "err.secret",
  "headers.authorization",
  "headers.cookie",
  "file.buffer",
  "files.*.buffer",
  "body",
  "query",
  "password",
  "*.password",
  "token",
  "*.token",
  "jwt",
  "*.jwt",
  "secret",
  "*.secret",
];

const httpLogger = pinoHttp({
  autoLogging: false,
  base: undefined,
  genReqId: (req) => (req as Request).requestId,
  redact: { paths: redactedPaths, remove: true },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url?.split("?")[0],
      id: req.id,
    }),
  },
});

export const logger = httpLogger.logger;

export function normalizedRoute(req: Request): string {
  if (req.route?.path) {
    return `${req.routeBase ?? req.baseUrl}${req.route.path}`;
  }

  return req.routeBase ?? "<unmatched>";
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  httpLogger(req, res);
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    logger.info({
      method: req.method,
      route: normalizedRoute(req),
      status: res.statusCode,
      durationMs: Number(process.hrtime.bigint() - startedAt) / 1_000_000,
      requestId: req.requestId,
      actor: req.actor?.type ?? "anonymous",
    }, "request completed");
  });

  next();
}
