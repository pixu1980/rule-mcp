/**
 * @module modules/bookmarks/bookmarks.router
 *
 * Route wiring for the bookmarks resource. Rate limiting is applied only to
 * the expensive scrape-and-create endpoint.
 */

import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../../common/utils/asyncHandler.js";
import { env } from "../../initEnv.js";
import {
  createBookmarkHandler,
  deleteBookmarkHandler,
  getBookmarkHandler,
  listBookmarksHandler,
} from "./bookmarks.controller.js";

const createBookmarkRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    errors: [{ code: "RATE_LIMITED", message: "Too many bookmarks created. Please slow down." }],
  },
});

export const bookmarksRouter = Router();

bookmarksRouter.post("/bookmarks", createBookmarkRateLimit, asyncHandler(createBookmarkHandler));
bookmarksRouter.get("/bookmarks", listBookmarksHandler);
bookmarksRouter.get("/bookmarks/:id", getBookmarkHandler);
bookmarksRouter.delete("/bookmarks/:id", deleteBookmarkHandler);
