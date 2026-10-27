
import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../config/database.js";
import { logger } from "../config/logger.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const migrationsDirectory = path.join(currentDirectory, "migrations");

const MIGRATION_FILE_PATTERN = /^\d{3}_[a-z0-9_]+\.sql$/;
const MIGRATION_LOCK_ID = 72401931;

async function runMigrations(): Promise<void> {
  const files = (await readdir(migrationsDirectory))
    .filter((file) => MIGRATION_FILE_PATTERN.test(file))
    .sort();

  const client = await pool.connect();
  let lockAcquired = false;

  try {
    await client.query(
      "SELECT pg_advisory_lock($1)",
      [MIGRATION_LOCK_ID],
    );
    lockAcquired = true;

    const appliedResult = await client.query<{ version: string }>(
      "SELECT version FROM schema_migrations",
    );

    const appliedMigrations = new Set(
      appliedResult.rows.map((row) => row.version),
    );

    for (const file of files) {
      if (appliedMigrations.has(file)) {
        logger.info(
          { migration: file },
          "Migration already applied; skipping",
        );
        continue;
      }

      const sql = await readFile(
        path.join(migrationsDirectory, file),
        "utf8",
      );

      logger.info({ migration: file }, "Applying migration");

      await client.query("BEGIN");

      try {
        await client.query(sql);

        await client.query(
          "INSERT INTO schema_migrations (version) VALUES ($1)",
          [file],
        );

        await client.query("COMMIT");

        logger.info(
          { migration: file },
          "Migration applied successfully",
        );
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    try {
      if (lockAcquired) {
        await client.query(
          "SELECT pg_advisory_unlock($1)",
          [MIGRATION_LOCK_ID],
        );
      }
    } finally {
      client.release();
    }
  }
}

runMigrations()
  .catch((error: unknown) => {
    logger.error({ err: error }, "Migration runner failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
