
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";

const { evalMock } = vi.hoisted(() => ({
  evalMock: vi.fn(),
}));

vi.mock("../config/redis.js", () => ({
  redisClient: {
    eval: evalMock,
  },
}));

import { rateLimit } from "./rate-limit.js";

function createMocks(
  clientId = "test-client-id",
) {
  const req = {
    authenticatedClient: {
      clientId,
      apiKeyId: "test-api-key-id",
      role: "CLIENT",
    },
  } as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  } as unknown as Response;

  const next = vi.fn() as NextFunction;

  return { req, res, next };
}

describe("rateLimit middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows a request within the limit", async () => {
    evalMock.mockResolvedValue([1, 60]);

    const { req, res, next } = createMocks();

    await rateLimit(100, 60)(req, res, next);

    expect(evalMock).toHaveBeenCalledWith(
      expect.any(String),
      {
        keys: ["gatewayx:rate-limit:test-client-id"],
        arguments: ["60"],
      },
    );

    expect(res.setHeader).toHaveBeenCalledWith(
      "RateLimit-Limit",
      100,
    );

    expect(res.setHeader).toHaveBeenCalledWith(
      "RateLimit-Remaining",
      99,
    );

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 429 when the request limit is exceeded", async () => {
    evalMock.mockResolvedValue([101, 15]);

    const { req, res, next } = createMocks();

    await rateLimit(100, 60)(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith(
      "RateLimit-Remaining",
      0,
    );

    expect(res.setHeader).toHaveBeenCalledWith(
      "Retry-After",
      15,
    );

    expect(res.status).toHaveBeenCalledWith(429);

    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please try again later.",
      },
    });

    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when the request is not authenticated", async () => {
    const { req, res, next } = createMocks();

    req.authenticatedClient = undefined;

    await rateLimit()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    expect(evalMock).not.toHaveBeenCalled();
  });

  it("passes Redis errors to the error handler", async () => {
    const redisError = new Error("Redis connection failed");

    evalMock.mockRejectedValue(redisError);

    const { req, res, next } = createMocks();

    await rateLimit()(req, res, next);

    expect(next).toHaveBeenCalledWith(redisError);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("uses a separate Redis key for each client", async () => {
    evalMock.mockResolvedValue([1, 60]);

    const { req, res, next } = createMocks("client-two");

    await rateLimit()(req, res, next);

    expect(evalMock).toHaveBeenCalledWith(
      expect.any(String),
      {
        keys: ["gatewayx:rate-limit:client-two"],
        arguments: ["60"],
      },
    );

    expect(next).toHaveBeenCalledOnce();
  });
});
    