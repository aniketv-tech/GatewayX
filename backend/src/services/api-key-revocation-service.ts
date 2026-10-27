
import { pool } from "../config/database.js";

export async function revokeApiKey(
  apiKeyId: string,
  clientId: string,
): Promise<boolean> {
  const result = await pool.query(
    `UPDATE api_keys
     SET
       is_active = FALSE,
       revoked_at = NOW()
     WHERE id = $1
       AND client_id = $2
       AND is_active = TRUE
       AND revoked_at IS NULL
     RETURNING id`,
    [apiKeyId, clientId],
  );

  return result.rows.length > 0;
}
