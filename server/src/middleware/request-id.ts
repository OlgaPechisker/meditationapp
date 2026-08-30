import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const REQUEST_ID_HEADER = "x-request-id";
const validRequestId = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const inbound = req.header(REQUEST_ID_HEADER)?.trim();
  req.requestId = inbound && validRequestId.test(inbound) ? inbound : randomUUID();
  res.setHeader(REQUEST_ID_HEADER, req.requestId);
  next();
}
