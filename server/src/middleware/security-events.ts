import type { Request } from "express";
import { logger, normalizedRoute } from "./logger.js";

export const SECURITY_EVENT = {
  LOGIN: "auth.login",
  TOKEN_REJECTED: "auth.token.rejected",
  ADMIN_MUTATION: "admin.mutation",
  ADMIN_MUTATION_CONTEXT_MISSING: "admin.mutation.authentication_context_missing",
  UPLOAD_REJECTED: "upload.rejected",
  CONFIGURATION_FAILURE: "configuration.validation.failed",
} as const;

type SecurityEventName = (typeof SECURITY_EVENT)[keyof typeof SECURITY_EVENT];
type SecurityOutcome = "success" | "failure" | "rejected" | "rate_limited" | "misconfigured";
type SecurityActor = "anonymous" | "admin" | "system";

export type SecurityResourceType =
  | "treatment"
  | "blog_post"
  | "comment"
  | "lecture"
  | "song"
  | "site_content"
  | "upload";

export interface SecurityEvent {
  event: SecurityEventName;
  action: "login" | "authenticate" | "create" | "update" | "delete" | "upsert" | "upload" | "validate";
  outcome: SecurityOutcome;
  requestId: string | null;
  route: string;
  actor: SecurityActor;
  resourceType?: SecurityResourceType;
  resourceId?: string;
  configurationFields?: readonly string[];
}

export interface AdminMutation {
  action: "create" | "update" | "delete" | "upsert" | "upload";
  resourceType: SecurityResourceType;
  resourceId: string;
}

/**
 * Startup configuration failures occur before request middleware, so their
 * requestId is deliberately null and their route is the stable startup sentinel.
 */
export const STARTUP_SECURITY_CONTEXT = {
  requestId: null,
  route: "<startup>",
} as const;

function emitSecurityEvent(event: SecurityEvent): void {
  const log = event.outcome === "success"
    ? logger.info.bind(logger)
    : event.outcome === "misconfigured"
      ? logger.error.bind(logger)
      : logger.warn.bind(logger);
  log(event, "security event");
}

function requestContext(req: Request) {
  return {
    requestId: req.requestId,
    route: normalizedRoute(req),
  };
}

export function emitFailedLogin(req: Request): void {
  emitSecurityEvent({
    event: SECURITY_EVENT.LOGIN,
    action: "login",
    outcome: "failure",
    actor: "anonymous",
    ...requestContext(req),
  });
}

export function emitRateLimitedLogin(req: Request): void {
  emitSecurityEvent({
    event: SECURITY_EVENT.LOGIN,
    action: "login",
    outcome: "rate_limited",
    actor: "anonymous",
    ...requestContext(req),
  });
}

export function emitSuccessfulLogin(req: Request): void {
  emitSecurityEvent({
    event: SECURITY_EVENT.LOGIN,
    action: "login",
    outcome: "success",
    actor: "anonymous",
    ...requestContext(req),
  });
}

export function emitRejectedToken(req: Request): void {
  emitSecurityEvent({
    event: SECURITY_EVENT.TOKEN_REJECTED,
    action: "authenticate",
    outcome: "rejected",
    actor: "anonymous",
    ...requestContext(req),
  });
}

export function emitAdminMutation(
  req: Request,
  mutation: AdminMutation,
): void {
  if (req.actor?.type !== "admin") {
    emitSecurityEvent({
      event: SECURITY_EVENT.ADMIN_MUTATION_CONTEXT_MISSING,
      outcome: "misconfigured",
      actor: "anonymous",
      ...mutation,
      ...requestContext(req),
    });
    return;
  }

  emitSecurityEvent({
    event: SECURITY_EVENT.ADMIN_MUTATION,
    outcome: "success",
    actor: req.actor.type,
    ...mutation,
    ...requestContext(req),
  });
}

export function emitRejectedUpload(req: Request): void {
  emitSecurityEvent({
    event: SECURITY_EVENT.UPLOAD_REJECTED,
    action: "upload",
    outcome: "rejected",
    actor: req.actor?.type ?? "anonymous",
    resourceType: "upload",
    ...requestContext(req),
  });
}

export function emitConfigurationFailure(fields: readonly string[]): void {
  emitSecurityEvent({
    event: SECURITY_EVENT.CONFIGURATION_FAILURE,
    action: "validate",
    outcome: "failure",
    actor: "system",
    configurationFields: [...new Set(fields)],
    ...STARTUP_SECURITY_CONTEXT,
  });
}
