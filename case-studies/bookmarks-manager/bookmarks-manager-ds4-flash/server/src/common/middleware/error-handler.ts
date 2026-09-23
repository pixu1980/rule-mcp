/**
 * @module common/middleware/error-handler
 * Centralized Express error handler.
 * Operational errors (AppError) → structured JSON.
 * Programmer errors → 500 with generic message.
 */

import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError.js";
import { logger } from "../../logger.js";

/**
 * Async handler wrapper to catch promise rejections.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Global error handler middleware (4 arguments).
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      statusCode: err.statusCode,
      correlationId: res.getHeader("x-request-id") || undefined,
      errors: [
        {
          code: err.statusCode * 100,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      ],
    });
    return;
  }

  // Programmer error — log full stack
  logger.error({ err }, "Unhandled error");
  res.status(500).json({
    statusCode: 500,
    errors: [{ code: 50000, message: "INTERNAL_SERVER_ERROR" }],
  });
}
