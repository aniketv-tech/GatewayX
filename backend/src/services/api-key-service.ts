
import { pool } from "../config/database.js";
import { generateApiKey } from "../utils/api-key.js";

export async function createApiKey(
  clientId: string,
  name: string,
): Promise<{
  plaintextKey: string;
  keyPrefix: string;
  apiKeyId: string;
}> {
  const generatedKey = generateApiKey();

  const result = await pool.query<{
    id: string;
    key_prefix: string;
  }>(
    `INSERT INTO api_keys (client_id, key_prefix, key_hash, name)
     VALUES ($1, $2, $3, $4)
     RETURNING id, key_prefix`,
    [
      clientId,
      generatedKey.keyPrefix,
      generatedKey.keyHash,
      name,
    ],
  );

  return {
    plaintextKey: generatedKey.plaintextKey,
    keyPrefix: result.rows[0].key_prefix,
    apiKeyId: result.rows[0].id,
  };
}
