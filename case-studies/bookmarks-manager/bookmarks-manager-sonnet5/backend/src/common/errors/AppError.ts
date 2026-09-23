/**
 * @module common/errors/AppError
 *
 * Operational error type used across handlers and services. Thrown for
 * expected failure conditions (validation, not-found, upstream fetch
 * failure) so the centralized error handler can map them to the correct
 * HTTP status and a stable machine-readable error code, matching the
 * response contract described in `api/openapi.yaml`.
 */

/** Stable machine-readable error codes returned in API error responses. */
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "BOOKMARK_NOT_FOUND"
  | "URL_NOT_ALLOWED"
  | "FETCH_FAILED"
  | "FETCH_TIMEOUT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

/**
 * Operational error carrying an HTTP status code and a stable error code.
 * Instances are safe to serialize directly to API clients — never include
 * stack traces or internal details in `message`.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(statusCode: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, AppError);
  }
}
