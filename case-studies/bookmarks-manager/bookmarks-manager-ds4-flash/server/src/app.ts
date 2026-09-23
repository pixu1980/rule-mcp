/**
 * @module app
 * Express app factory: middleware registration, route mounting, error handler.
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { logger } from "./logger.js";
import { healthRouter } from "./modules/health/health.router.js";
import { bookmarksRouter } from "./modules/bookmarks/bookmarks.router.js";
import { errorHandler } from "./common/middleware/error-handler.js";

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

export function createApp() {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS with explicit whitelist
  app.use(
    cors({
      origin: ALLOWED_ORIGINS,
      methods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Accept-Language"],
      exposedHeaders: ["X-Total-Count"],
    }),
  );

  // Compression
  app.use(compression());

  // Body parser
  app.use(express.json({ limit: "1mb" }));

  // Structured request logging (lightweight, skip pino-http for now)
  app.use((req, _res, next) => {
    logger.info({ method: req.method, url: req.url }, "request");
    next();
  });

  // API v1 routes
  const apiRouter = express.Router();
  apiRouter.use("/health", healthRouter);
  apiRouter.use("/bookmarks", bookmarksRouter);

  app.use("/api/v1", apiRouter);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}
