
import "dotenv/config";
import express from "express";
import { connectRedis } from "./config/redis.js";
import { logger } from "./config/logger.js";
import { pool } from "./config/database.js";

import { errorHandler } from "./middleware/error-handler.js";

import apiKeyRoutes from "./routes/api-key-routes.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

// Parse incoming JSON request bodies
app.use(express.json());

// --------------------------------------------------
// Basic API health check
// --------------------------------------------------
app.get("/health", (_req, res) => {
  logger.info("Health endpoint requested");

  res.status(200).json({
    status: "ok",
    service: "gatewayx-backend",
    timestamp: new Date().toISOString(),
  });
});

// --------------------------------------------------
// Database connectivity check
// --------------------------------------------------
app.get("/health/db", async (_req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT NOW() AS database_time",
    );

    res.status(200).json({
      status: "ok",
      database: "connected",
      databaseTime: result.rows[0].database_time,
    });
  } catch (err) {
    next(err);
  }
});

// --------------------------------------------------
// API key management routes
// Authentication is applied inside apiKeyRoutes
// --------------------------------------------------
app.use("/api/keys", apiKeyRoutes);

// --------------------------------------------------
// Centralized error handler
// Keep this after all routes and middleware
// --------------------------------------------------
app.use(errorHandler);

// --------------------------------------------------
// Start the backend server
// --------------------------------------------------
async function startServer(): Promise<void> {
  try {
    await connectRedis();

    app.listen(PORT, () => {
      logger.info(
        { port: PORT },
        "GatewayX backend started",
      );
    });
  } catch (error) {
    logger.error({ error }, "Failed to start GatewayX backend");
    process.exit(1);
  }
}

void startServer();
