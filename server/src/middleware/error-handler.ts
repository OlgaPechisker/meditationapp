import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";
import {
  ApplicationError,
  ConflictError,
  NotFoundError,
  PayloadTooLargeError,
  UploadValidationError,
  ValidationError,
  validationErrorFromZod,
} from "../errors/application-error.js";
import { logger } from "./logger.js";
import { emitRejectedUpload } from "./security-events.js";

function classifyError(error: unknown): ApplicationError | undefined {
  if (error instanceof ApplicationError) {
    return error;
  }
  if (error instanceof ZodError) {
    return validationErrorFromZod(error);
  }
  if (error instanceof multer.MulterError) {
    return error.code === "LIMIT_FILE_SIZE"
      ? new PayloadTooLargeError()
      : new ValidationError("Invalid upload");
  }
  if (typeof error === "object" && error !== null) {
    const code = "code" in error ? error.code : undefined;
    if (code === "P2002" || code === "P2003") {
      return new ConflictError();
    }
    if (code === "P2025") {
      return new NotFoundError();
    }
    if ("type" in error) {
      if (error.type === "entity.too.large") {
        return new PayloadTooLargeError();
      }
      if (error.type === "entity.parse.failed") {
        return new ValidationError("Invalid JSON");
      }
    }
  }
  return undefined;
}

export function errorHandler(error: unknown, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    next(error);
    return;
  }

  const applicationError = classifyError(error);

  if (applicationError) {
    if (error instanceof UploadValidationError || error instanceof multer.MulterError) {
      emitRejectedUpload(req);
    }
    logger.warn({
      err: { name: applicationError.name, code: applicationError.code },
      requestId: req.requestId,
    }, "request failed");
    res.status(applicationError.status).json({
      code: applicationError.code,
      message: applicationError.message,
      requestId: req.requestId,
      ...(applicationError.details ? { details: applicationError.details } : {}),
    });
    return;
  }

  logger.error({ err: error, requestId: req.requestId }, "unexpected request failure");
  res.status(500).json({
    code: "INTERNAL_ERROR",
    message: "Internal server error",
    requestId: req.requestId,
  });
}
