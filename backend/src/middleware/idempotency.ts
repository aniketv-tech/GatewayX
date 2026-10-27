
import type { Request, Response, NextFunction } from "express";
import {
  beginIdempotency,
  completeIdempotency,
  createRequestFingerprint,
} from "../services/idempotency-service.js";

export async function idempotency(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authenticatedClient = req.authenticatedClient;

  if (!authenticatedClient) {
    res.status(401).json({
      message: "Authentication required",
    });
    return;
  }

  const idempotencyKey = req.header("Idempotency-Key")?.trim();

  if (!idempotencyKey) {
    res.status(400).json({
      message: "Idempotency-Key header is required",
    });
    return;
  }

  if (idempotencyKey.length > 255) {
    res.status(400).json({
      message: "Idempotency-Key must not exceed 255 characters",
    });
    return;
  }

  try {
    const requestFingerprint = createRequestFingerprint(
      req.method,
      req.originalUrl,
      req.body,
    );

    const result = await beginIdempotency(
      authenticatedClient.clientId,
      idempotencyKey,
      requestFingerprint,
    );

    if (result.kind === "CONFLICT") {
      res.status(409).json({
        message:
          "Idempotency key was already used with a different request",
      });
      return;
    }

    if (result.kind === "PROCESSING") {
      res.setHeader("Retry-After", "1");
      res.status(409).json({
        message: "A request with this idempotency key is still processing",
      });
      return;
    }

    if (result.kind === "COMPLETED") {
      res.setHeader("Idempotency-Replayed", "true");
      res.status(result.responseStatus).json(result.responseBody);
      return;
    }

    const recordId = result.recordId;
    const originalJson = res.json.bind(res);

    res.json = ((body: unknown) => {
      void completeIdempotency(recordId, res.statusCode, body)
        .then(() => {
          originalJson(body);
        })
        .catch((error: unknown) => {
          next(error);
        });

      return res;
    }) as Response["json"];

    next();
  } catch (error) {
    next(error);
  }
}
