/**
 * @module server
 *
 * HTTP listener bootstrap and graceful shutdown handling. This is the
 * package's `main` entry point; all Express wiring lives in `app.ts`.
 */

import { createServer } from "node:http";
import "dotenv/config";
import pino from "pino";
import { createApp } from "./app.js";
import { env } from "./initEnv.js";

const logger = pino({ level: env.LOG_LEVEL });
const app = createApp();
const server = createServer(app);

server.listen(env.PORT, () => {
  logger.info(`bookmarks-backend listening on port ${env.PORT} (${env.NODE_ENV})`);
});

/** Closes the HTTP server on termination signals, allowing in-flight requests to finish. */
function shutdown(signal: string): void {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
