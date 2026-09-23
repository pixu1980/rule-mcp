/**
 * @module modules/health/health.router
 *
 * Liveness/readiness endpoint. Kept dependency-free so it always reflects
 * whether the Node process itself is responsive.
 */

import { Router } from "express";

export const healthRouter = Router();

/**
 * GET /health — returns 200 with process uptime when the server is alive.
 */
healthRouter.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", uptimeSeconds: Math.round(process.uptime()) });
});
