
import type { RequestHandler } from "express";

import type { AuthenticatedClient } from "../services/api-key-auth-service.js";

type ClientRole = AuthenticatedClient["role"];

export function authorize(...allowedRoles: ClientRole[]): RequestHandler {
  return (req, res, next) => {
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

    if (!allowedRoles.includes(authenticatedClient.role)) {
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to perform this action.",
        },
      });
      return;
    }

    next();
  };
}
