
import { createHash } from "node:crypto";
import { pool } from "../config/database.js";

export interface AuthenticatedClient {
  clientId: string;
  apiKeyId: string;
  role: "ADMIN" | "ANALYST" | "CLIENT";
}

export async function authenticateApiKey(
  plaintextKey: string,
): Promise<AuthenticatedClient | null> {
  const keyHash = createHash("sha256")
    .update(plaintextKey, "utf8")
    .digest("hex");

  const result = await pool.query<AuthenticatedClient>(
    `UPDATE api_keys AS ak
     SET last_used_at = NOW()
     FROM clients AS c
     WHERE ak.client_id = c.id
       AND ak.key_hash = $1
       AND ak.is_active = TRUE
       AND ak.revoked_at IS NULL
       AND (ak.expires_at IS NULL OR ak.expires_at > NOW())
       AND c.is_active = TRUE
     RETURNING
       c.id AS "clientId",
       ak.id AS "apiKeyId",
       c.role AS role`,
    [keyHash],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}
