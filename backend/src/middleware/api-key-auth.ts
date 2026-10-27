
import type { RequestHandler } from "express";
import { authenticateApiKey } from "../services/api-key-auth-service.js";

export const apiKeyAuth: RequestHandler = async (
  req,
  res,
  next,
) => {
  const apiKey = req.header("x-api-key");

  if (!apiKey || !apiKey.startsWith("gx_live_")) {
    res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "A valid API key is required.",
      },
    });
    return;
  }

  try {
    const authenticatedClient = await authenticateApiKey(apiKey);

    if (!authenticatedClient) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "A valid API key is required.",
        },
      });
      return;
    }

    req.authenticatedClient = authenticatedClient;

    next();
  } catch (error) {
    next(error);
  }
};
