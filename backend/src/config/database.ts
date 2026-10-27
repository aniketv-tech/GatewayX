import pg from "pg";
import { logger } from "./logger.js";

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? "gatewayx",
  user: process.env.DB_USER ?? "gatewayx",
  password: process.env.DB_PASSWORD ?? "local_dev_password",
  max: 10,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  logger.error({ err }, "Unexpected PostgreSQL pool error");
});