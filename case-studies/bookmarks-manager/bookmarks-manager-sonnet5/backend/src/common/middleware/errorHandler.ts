/**
 * @module common/middleware/errorHandler
 *
 * Centralized Express error-handling middleware (4-argument signature).
 * Maps {@link AppError} instances to their declared status/code, and treats
 * any other thrown value as an unexpected 500. Never leaks stack traces or
 * internal messages to the client, only a stable error code, a safe
 * message, and a correlation id for support/log correlation.
 */

import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { AppError } from "../errors/AppError.js";

/** Shape of every error response returned by the API. */
export interface ApiErrorBody {
  statusCode: number;
  correlationId: string;
  errors: Array<{ code: string; message: string; details?: unknown }>;
}

/**
 * Express error-handling middleware. Must be registered last, after all
 * routes.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const correlationId = (req.headers["x-correlation-id"] as string | undefined) ?? randomUUID();

  if (err instanceof AppError) {
    const body: ApiErrorBody = {
      statusCode: err.statusCode,
      correlationId,
      errors: [{ code: err.code, message: err.message, details: err.details }],
    };
    res.status(err.statusCode).json(body);
    return;
  }

  req.log?.error({ err, correlationId }, "Unhandled error");
  const body: ApiErrorBody = {
    statusCode: 500,
    correlationId,
    errors: [{ code: "INTERNAL_ERROR", message: "An unexpected error occurred." }],
  };
  res.status(500).json(body);
}

/**
 * 404 fallback for unmatched routes, formatted with the same error contract
 * as {@link errorHandler}.
 */
export function notFoundHandler(req: Request, res: Response): void {
  const body: ApiErrorBody = {
    statusCode: 404,
    correlationId: randomUUID(),
    errors: [{ code: "ROUTE_NOT_FOUND", message: `No route for ${req.method} ${req.path}` }],
  };
  res.status(404).json(body);
}
