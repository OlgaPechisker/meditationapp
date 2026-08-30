import type { ZodError } from "zod";

export type ApplicationErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "PAYLOAD_TOO_LARGE"
  | "DEPENDENCY_UNAVAILABLE";

export interface ValidationDetails {
  fields: Record<string, string[]>;
}

export class ApplicationError extends Error {
  constructor(
    public readonly code: ApplicationErrorCode,
    public readonly status: number,
    message: string,
    public readonly details?: ValidationDetails,
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}

export class ValidationError extends ApplicationError {
  constructor(message = "Invalid request", details?: ValidationDetails) {
    super("VALIDATION_ERROR", 400, message, details);
  }
}

export class UploadValidationError extends ValidationError {
  constructor() {
    super("Invalid upload");
    this.name = "UploadValidationError";
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message = "Resource not found") {
    super("NOT_FOUND", 404, message);
  }
}

export class ConflictError extends ApplicationError {
  constructor(message = "Resource conflict") {
    super("CONFLICT", 409, message);
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message = "Authentication required") {
    super("UNAUTHORIZED", 401, message);
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message = "Access denied") {
    super("FORBIDDEN", 403, message);
  }
}

export class RateLimitedError extends ApplicationError {
  constructor(message = "Too many requests") {
    super("RATE_LIMITED", 429, message);
  }
}

export class PayloadTooLargeError extends ApplicationError {
  constructor(message = "Payload too large") {
    super("PAYLOAD_TOO_LARGE", 413, message);
  }
}

export class DependencyUnavailableError extends ApplicationError {
  constructor(message = "Service temporarily unavailable") {
    super("DEPENDENCY_UNAVAILABLE", 503, message);
  }
}

export function validationErrorFromZod(error: ZodError): ValidationError {
  const fields: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.map(String).join(".") || "root";
    (fields[path] ??= []).push(issue.message);
  }

  return new ValidationError("Invalid request", { fields });
}
