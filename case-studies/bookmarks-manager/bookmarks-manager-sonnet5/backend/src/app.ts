/**
 * @module app
 *
 * Express application factory. Wires middleware in the mandated order
 * (security headers -> CORS -> body parsing -> logging -> routes -> 404 ->
 * centralized error handler) and mounts the versioned API under `/api/v1`.
 * Kept separate from `server.ts` so tests can import the app without
 * binding a TCP port.
 */

import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { errorHandler, notFoundHandler } from "./common/middleware/errorHandler.js";
import { requestLogger } from "./common/middleware/requestLogger.js";
import { env } from "./initEnv.js";
import { bookmarksRouter } from "./modules/bookmarks/bookmarks.router.js";
import { healthRouter } from "./modules/health/health.router.js";

/** Builds and returns a fully configured Express application. */
export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }),
  );
  app.use(cors({ origin: env.ALLOWED_ORIGINS, methods: ["GET", "POST", "DELETE"] }));
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);

  app.use(healthRouter);
  app.use("/api/v1", bookmarksRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
