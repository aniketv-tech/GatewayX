
import type { RequestHandler } from "express";
import { redisClient } from "../config/redis.js";

const DEFAULT_LIMIT = 100;
const DEFAULT_WINDOW_SECONDS = 60;

const RATE_LIMIT_SCRIPT = `
local current = redis.call("INCR", KEYS[1])

if current == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end

local ttl = redis.call("TTL", KEYS[1])

return { current, ttl }
`;

export function rateLimit(
  limit = DEFAULT_LIMIT,
  windowSeconds = DEFAULT_WINDOW_SECONDS,
): RequestHandler {
  return async (req, res, next) => {
    const authenticatedClient = req.authenticatedClient;

    if (!authenticatedClient) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication is required.",
        },
      });
      return;
    }

    try {
      const clientId = authenticatedClient.clientId;
      const key = `gatewayx:rate-limit:${clientId}`;

      const result = (await redisClient.eval(RATE_LIMIT_SCRIPT, {
        keys: [key],
        arguments: [String(windowSeconds)],
      })) as number[];

      const [currentCount, ttl] = result;

      const remaining = Math.max(0, limit - currentCount);
      const resetSeconds = Math.max(0, ttl);

      res.setHeader("RateLimit-Limit", limit);
      res.setHeader("RateLimit-Remaining", remaining);
      res.setHeader(
        "RateLimit-Reset",
        Math.floor(Date.now() / 1000) + resetSeconds,
      );

      if (currentCount > limit) {
        res.setHeader("Retry-After", resetSeconds);

        res.status(429).json({
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again later.",
          },
        });

        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
