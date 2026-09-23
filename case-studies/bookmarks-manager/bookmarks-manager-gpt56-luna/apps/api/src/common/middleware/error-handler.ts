/** Express error middleware with the documented structured error contract. */
import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../error.js";

export const errorHandler: ErrorRequestHandler = (
  error,
  request,
  response,
  _next,
) => {
  const correlationId = String(request.id ?? crypto.randomUUID());
  if (error instanceof ZodError) {
    response.status(400).json({
      statusCode: 400,
      "correlation-id": correlationId,
      errors: [
        {
          code: "VALIDATION_ERROR",
          message: error.issues[0]?.message ?? "Invalid request",
        },
      ],
    });
    return;
  }
  const normalized =
    error instanceof AppError ? error : new AppError(500, "INTERNAL_ERROR");
  response.status(normalized.statusCode).json({
    statusCode: normalized.statusCode,
    "correlation-id": correlationId,
    errors: [{ code: normalized.code, message: normalized.message }],
  });
};
