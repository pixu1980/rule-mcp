/**
 * @module common/utils/asyncHandler
 *
 * Wraps an async Express request handler so rejected promises are forwarded
 * to `next(error)` instead of crashing the process or hanging the request.
 */

import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Wraps an async route handler, forwarding rejections to Express's error
 * pipeline.
 *
 * @param fn - async handler that may throw or reject.
 * @returns an Express-compatible handler.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
