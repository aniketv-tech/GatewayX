import type { ErrorRequestHandler } from "express";
import { logger } from "../config/logger.js";

export const errorHandler: ErrorRequestHandler = (
  err,
  _req,
  res,
  _next,
) => {
  logger.error({ err }, "Unhandled request error");

  if (res.headersSent) {
    return;
  }

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred.",
    },
  });
};