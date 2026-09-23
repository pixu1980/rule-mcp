/**
 * @module common/middleware/requestLogger
 *
 * Structured request logging via pino-http. Redacts sensitive headers and
 * assigns a stable request id used for correlation with error responses.
 */

import pinoHttp from "pino-http";
import { randomUUID } from "node:crypto";
import { env } from "../../initEnv.js";

/** Shared request logger middleware, mounted early in the pipeline. */
export const requestLogger = pinoHttp({
  level: env.LOG_LEVEL,
  genReqId: (req, res) => {
    const existing = req.headers["x-correlation-id"];
    const id = (Array.isArray(existing) ? existing[0] : existing) ?? randomUUID();
    res.setHeader("x-correlation-id", id);
    return id;
  },
  redact: ["req.headers.authorization", "req.headers.cookie"],
});
