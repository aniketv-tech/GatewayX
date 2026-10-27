
import { createHash } from "node:crypto";
import { pool } from "../config/database.js";

export type IdempotencyStatus = "PROCESSING" | "COMPLETED";

export type IdempotencyResult =
  | { kind: "NEW"; recordId: string }
  | { kind: "PROCESSING" }
  | {
      kind: "COMPLETED";
      responseStatus: number;
      responseBody: unknown;
    }
  | { kind: "CONFLICT" };

export function createRequestFingerprint(
  method: string,
  route: string,
  body: unknown,
): string {
  const normalizedRequest = JSON.stringify({
    method: method.toUpperCase(),
    route,
    body,
  });

  return createHash("sha256")
    .update(normalizedRequest, "utf8")
    .digest("hex");
}

export async function beginIdempotency(
  clientId: string,
  idempotencyKey: string,
  requestFingerprint: string,
): Promise<IdempotencyResult> {
  const insertResult = await pool.query<{ id: string }>(
    `
      INSERT INTO idempotency_records (
        client_id,
        idempotency_key,
        request_fingerprint,
        status
      )
      VALUES ($1, $2, $3, 'PROCESSING')
      ON CONFLICT (client_id, idempotency_key)
      DO UPDATE SET
        request_fingerprint = EXCLUDED.request_fingerprint,
        response_status = NULL,
        response_body = NULL,
        status = 'PROCESSING',
        created_at = NOW(),
        updated_at = NOW(),
        expires_at = NOW() + INTERVAL '24 hours'
      WHERE idempotency_records.expires_at <= NOW()
      RETURNING id
    `,
    [clientId, idempotencyKey, requestFingerprint],
  );

  if (insertResult.rows.length > 0) {
    return {
      kind: "NEW",
      recordId: insertResult.rows[0].id,
    };
  }

  const existingResult = await pool.query<{
    requestFingerprint: string;
    responseStatus: number | null;
    responseBody: unknown | null;
    status: IdempotencyStatus;
  }>(
    `
      SELECT
        request_fingerprint AS "requestFingerprint",
        response_status AS "responseStatus",
        response_body AS "responseBody",
        status
      FROM idempotency_records
      WHERE client_id = $1
        AND idempotency_key = $2
        AND expires_at > NOW()
    `,
    [clientId, idempotencyKey],
  );

  const existing = existingResult.rows[0];

  if (!existing) {
    return { kind: "PROCESSING" };
  }

  if (existing.requestFingerprint !== requestFingerprint) {
    return { kind: "CONFLICT" };
  }

  if (existing.status === "PROCESSING") {
    return { kind: "PROCESSING" };
  }

  return {
    kind: "COMPLETED",
    responseStatus: existing.responseStatus ?? 200,
    responseBody: existing.responseBody,
  };
}

export async function completeIdempotency(
  recordId: string,
  responseStatus: number,
  responseBody: unknown,
): Promise<void> {
  await pool.query(
    `
      UPDATE idempotency_records
      SET
        status = 'COMPLETED',
        response_status = $2,
        response_body = $3,
        updated_at = NOW()
      WHERE id = $1
        AND status = 'PROCESSING'
    `,
    [recordId, responseStatus, JSON.stringify(responseBody)],
  );
}
