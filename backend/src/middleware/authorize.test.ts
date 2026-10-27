
import { describe, expect, it, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";

import { authorize } from "./authorize.js";

function createMocks(role?: "ADMIN" | "ANALYST" | "CLIENT") {
  const req = {
    authenticatedClient: role
      ? {
          clientId: "test-client-id",
          apiKeyId: "test-api-key-id",
          role,
        }
      : undefined,
  } as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;

  const next = vi.fn() as NextFunction;

  return { req, res, next };
}

describe("authorize middleware", () => {
  it("returns 401 when no client is authenticated", () => {
    const { req, res, next } = createMocks();

    authorize("ADMIN")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication is required.",
      },
    });

    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when the role is not allowed", () => {
    const { req, res, next } = createMocks("ANALYST");

    authorize("ADMIN", "CLIENT")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "FORBIDDEN",
        message: "You do not have permission to perform this action.",
      },
    });

    expect(next).not.toHaveBeenCalled();
  });

  it("allows an ADMIN role", () => {
    const { req, res, next } = createMocks("ADMIN");

    authorize("ADMIN", "CLIENT")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("allows a CLIENT role", () => {
    const { req, res, next } = createMocks("CLIENT");

    authorize("ADMIN", "CLIENT")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("allows an ANALYST when explicitly permitted", () => {
    const { req, res, next } = createMocks("ANALYST");

    authorize("ANALYST")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
