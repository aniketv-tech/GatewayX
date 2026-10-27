
import { createClient } from "redis";
import { logger } from "./logger.js";

const redisUrl = process.env.REDIS_CACHE_URL ?? "redis://localhost:6379";

export const redisClient = createClient({
  url: redisUrl,
});

redisClient.on("error", (error) => {
  logger.error({ error }, "Redis cache connection error");
});

redisClient.on("connect", () => {
  logger.info("Redis cache connection established");
});

redisClient.on("reconnecting", () => {
  logger.warn("Redis cache reconnecting");
});

export async function connectRedis(): Promise<void> {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}
