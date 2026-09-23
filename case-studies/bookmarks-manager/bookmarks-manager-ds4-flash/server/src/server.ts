/**
 * @module server
 * HTTP server entry point with graceful shutdown.
 */

import { createApp } from "./app.js";
import { logger } from "./logger.js";

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || "0.0.0.0";

const app = createApp();

const server = app.listen(PORT, HOST, () => {
  logger.info({ port: PORT, host: HOST }, "Server started");
});

/** Graceful shutdown handler */
function shutdown(signal: string) {
  logger.info({ signal }, "Shutdown signal received");
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });

  // Force exit after 10s
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
