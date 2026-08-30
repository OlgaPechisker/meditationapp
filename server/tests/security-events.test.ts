import type { Request } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "../src/middleware/logger.js";
import {
  SECURITY_EVENT,
  emitAdminMutation,
  emitConfigurationFailure,
  emitFailedLogin,
  emitRateLimitedLogin,
  emitRejectedToken,
  emitRejectedUpload,
  emitSuccessfulLogin,
  type SecurityEvent,
} from "../src/middleware/security-events.js";

type CapturedLog = {
  level: "info" | "warn" | "error";
  event: SecurityEvent;
  message: string | undefined;
};

const sensitiveValues = {
  password: "password-must-never-be-logged",
  token: "token-must-never-be-logged",
  authorization: "Bearer authorization-must-never-be-logged",
  cookie: "session=cookie-must-never-be-logged",
  secret: "secret-must-never-be-logged",
  comment: "this complete private comment must never be logged",
};

function request(actor: "admin" | "anonymous" = "admin") {
  return {
    requestId: "request-id-123",
    routeBase: "/api/test",
    route: { path: "/:id" },
    actor: actor === "admin" ? { type: "admin" } : undefined,
    headers: {
      authorization: sensitiveValues.authorization,
      cookie: sensitiveValues.cookie,
    },
    body: {
      password: sensitiveValues.password,
      token: sensitiveValues.token,
      secret: sensitiveValues.secret,
      content: sensitiveValues.comment,
    },
    file: { buffer: Buffer.from("file-buffer-must-never-be-logged") },
  } as unknown as Request;
}

function captureSecurityLogs() {
  const logs: CapturedLog[] = [];
  const capture = (level: CapturedLog["level"]) => (event: SecurityEvent, message?: string) => {
    logs.push({ level, event, message });
  };

  vi.spyOn(logger, "info").mockImplementation(capture("info") as never);
  vi.spyOn(logger, "warn").mockImplementation(capture("warn") as never);
  vi.spyOn(logger, "error").mockImplementation(capture("error") as never);
  return logs;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("structured security events", () => {
  it("captures all login outcomes and rejected tokens with stable required fields", () => {
    const logs = captureSecurityLogs();
    const anonymousRequest = request("anonymous");

    emitSuccessfulLogin(anonymousRequest);
    emitFailedLogin(anonymousRequest);
    emitRateLimitedLogin(anonymousRequest);
    emitRejectedToken(anonymousRequest);

    expect(logs).toEqual([
      {
        level: "info",
        message: "security event",
        event: {
          event: SECURITY_EVENT.LOGIN,
          action: "login",
          outcome: "success",
          actor: "anonymous",
          requestId: "request-id-123",
          route: "/api/test/:id",
        },
      },
      {
        level: "warn",
        message: "security event",
        event: {
          event: SECURITY_EVENT.LOGIN,
          action: "login",
          outcome: "failure",
          actor: "anonymous",
          requestId: "request-id-123",
          route: "/api/test/:id",
        },
      },
      {
        level: "warn",
        message: "security event",
        event: {
          event: SECURITY_EVENT.LOGIN,
          action: "login",
          outcome: "rate_limited",
          actor: "anonymous",
          requestId: "request-id-123",
          route: "/api/test/:id",
        },
      },
      {
        level: "warn",
        message: "security event",
        event: {
          event: SECURITY_EVENT.TOKEN_REJECTED,
          action: "authenticate",
          outcome: "rejected",
          actor: "anonymous",
          requestId: "request-id-123",
          route: "/api/test/:id",
        },
      },
    ]);
  });

  it("records each administered resource mutation, rejected uploads, and configuration failures", () => {
    const logs = captureSecurityLogs();
    const adminRequest = request();
    const mutations = [
      ["create", "treatment", "1"],
      ["update", "blog_post", "2"],
      ["delete", "comment", "3"],
      ["create", "lecture", "4"],
      ["update", "song", "5"],
      ["upsert", "site_content", "about:en"],
      ["upload", "upload", "stored-image.png"],
    ] as const;

    for (const [action, resourceType, resourceId] of mutations) {
      emitAdminMutation(adminRequest, { action, resourceType, resourceId });
    }
    emitRejectedUpload(adminRequest);
    emitConfigurationFailure(["JWT_SECRET", "ADMIN_PASSWORD_HASH"]);

    const mutationEvents = logs
      .filter((log) => log.event.event === SECURITY_EVENT.ADMIN_MUTATION)
      .map((log) => log.event);
    expect(mutationEvents).toEqual(mutations.map(([action, resourceType, resourceId]) => ({
      event: SECURITY_EVENT.ADMIN_MUTATION,
      action,
      outcome: "success",
      actor: "admin",
      requestId: "request-id-123",
      route: "/api/test/:id",
      resourceType,
      resourceId,
    })));
    expect(logs).toContainEqual({
      level: "warn",
      message: "security event",
      event: {
        event: SECURITY_EVENT.UPLOAD_REJECTED,
        action: "upload",
        outcome: "rejected",
        actor: "admin",
        requestId: "request-id-123",
        route: "/api/test/:id",
        resourceType: "upload",
      },
    });
    expect(logs).toContainEqual({
      level: "warn",
      message: "security event",
      event: {
        event: SECURITY_EVENT.CONFIGURATION_FAILURE,
        action: "validate",
        outcome: "failure",
        actor: "system",
        requestId: null,
        route: "<startup>",
        configurationFields: ["JWT_SECRET", "ADMIN_PASSWORD_HASH"],
      },
    });
  });

  it("never includes request credentials, secrets, buffers, or raw comment content", () => {
    const logs = captureSecurityLogs();
    const unsafeRequest = request();

    emitSuccessfulLogin(unsafeRequest);
    emitRejectedToken(unsafeRequest);
    emitAdminMutation(unsafeRequest, {
      action: "update",
      resourceType: "blog_post",
      resourceId: "42",
    });
    emitRejectedUpload(unsafeRequest);
    emitConfigurationFailure(["JWT_SECRET"]);

    const output = JSON.stringify(logs);
    for (const value of Object.values(sensitiveValues)) {
      expect(output).not.toContain(value);
    }
    expect(output).not.toContain("file-buffer-must-never-be-logged");
  });
});
