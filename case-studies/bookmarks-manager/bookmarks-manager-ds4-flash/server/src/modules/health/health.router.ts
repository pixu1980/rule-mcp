/**
 * @module modules/health/health.router
 * Health check endpoint.
 */

import { Router } from "express";
import type { Request, Response } from "express";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "bookmarks-manager-api",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
  });
});

export { router as healthRouter };
