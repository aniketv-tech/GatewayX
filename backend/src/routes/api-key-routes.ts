
import { Router } from "express";

import { apiKeyAuth } from "../middleware/api-key-auth.js";
import { authorize } from "../middleware/authorize.js";

import { createApiKey } from "../services/api-key-service.js";
import { revokeApiKey } from "../services/api-key-revocation-service.js";

const router = Router();

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// All key-management routes require authentication.
router.use(apiKeyAuth);

// Only ADMIN and CLIENT roles can manage their own API keys.
router.use(authorize("ADMIN", "CLIENT"));

// Create an API key for the authenticated client.
router.post("/", async (req, res, next) => {
  try {
    const authenticatedClient = req.authenticatedClient;

    if (!authenticatedClient) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication is required.",
        },
      });
      return;
    }

    const { name } = req.body as { name?: unknown };

    if (
      typeof name !== "string" ||
      name.trim().length < 1 ||
      name.trim().length > 100
    ) {
      res.status(400).json({
        error: {
          code: "INVALID_API_KEY_NAME",
          message: "Name must be between 1 and 100 characters.",
        },
      });
      return;
    }

    const result = await createApiKey(
      authenticatedClient.clientId,
      name.trim(),
    );

    // The plaintext key is returned only at creation time.
    res.status(201).json({
      message: "API key created. Save it now; it will not be shown again.",
      apiKeyId: result.apiKeyId,
      keyPrefix: result.keyPrefix,
      plaintextKey: result.plaintextKey,
    });
  } catch (error) {
    next(error);
  }
});

// Revoke an API key belonging to the authenticated client.
router.delete("/:keyId", async (req, res, next) => {
  try {
    const authenticatedClient = req.authenticatedClient;

    if (!authenticatedClient) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication is required.",
        },
      });
      return;
    }

    const keyId = req.params.keyId;

    if (!UUID_PATTERN.test(keyId)) {
      res.status(400).json({
        error: {
          code: "INVALID_API_KEY_ID",
          message: "A valid API key ID is required.",
        },
      });
      return;
    }

    const revoked = await revokeApiKey(
      keyId,
      authenticatedClient.clientId,
    );

    if (!revoked) {
      res.status(404).json({
        error: {
          code: "API_KEY_NOT_FOUND",
          message: "API key not found or already revoked.",
        },
      });
      return;
    }

    res.status(200).json({
      message: "API key revoked successfully.",
      apiKeyId: keyId,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
