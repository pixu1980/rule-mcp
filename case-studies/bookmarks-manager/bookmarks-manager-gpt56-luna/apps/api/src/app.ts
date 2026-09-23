/** Express application composition: security, transport, routes, and errors. */
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { errorHandler } from "./common/middleware/error-handler.js";
import { env } from "./config.js";
import { logger } from "./logger.js";
import { createBookmarksRouter } from "./modules/bookmarks/bookmarks.routes.js";

function isAllowedOrigin(origin: string | undefined): boolean | string {
  if (!origin) return true;
  const allowedOrigins = new Set([env.WEB_ORIGIN]);
  try {
    const configured = new URL(env.WEB_ORIGIN);
    const loopbackHost =
      configured.hostname === "localhost" ? "127.0.0.1" : "localhost";
    allowedOrigins.add(
      new URL(
        `${configured.protocol}//${loopbackHost}${configured.port ? `:${configured.port}` : ""}`,
      ).origin,
    );
  } catch {
    return false;
  }
  return allowedOrigins.has(origin) ? origin : false;
}

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
    }),
  );
  app.use(express.json({ limit: "32kb", type: "application/json" }));
  app.use(pinoHttp({ logger }));
  app.get("/health", (_request, response) =>
    response.json({
      status: "ok",
      service: "luma-api",
      timestamp: new Date().toISOString(),
    }),
  );
  app.use("/api/v1/bookmarks", createBookmarksRouter());
  app.use(errorHandler);
  return app;
}

export const app = createApp();
