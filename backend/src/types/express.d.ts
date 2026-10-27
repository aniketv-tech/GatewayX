
import type { AuthenticatedClient } from "../services/api-key-auth-service.js";

declare global {
  namespace Express {
    interface Request {
      authenticatedClient?: AuthenticatedClient;
    }
  }
}

export {};
