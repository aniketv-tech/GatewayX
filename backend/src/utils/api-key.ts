
import { createHash, randomBytes } from "node:crypto";

const API_KEY_PREFIX = "gx_live_";
const API_KEY_BYTES = 32;

/**
 * Generates a cryptographically secure API key.
 *
 * The plaintext key is returned once to the caller.
 * Only its SHA-256 hash should be stored in the database.
 */
export function generateApiKey(): {
  plaintextKey: string;
  keyPrefix: string;
  keyHash: string;
} {
  const secret = randomBytes(API_KEY_BYTES).toString("hex");
  const plaintextKey = `${API_KEY_PREFIX}${secret}`;

  const keyPrefix = plaintextKey.slice(0, 12);

  const keyHash = createHash("sha256")
    .update(plaintextKey, "utf8")
    .digest("hex");

  return {
    plaintextKey,
    keyPrefix,
    keyHash,
  };
}
