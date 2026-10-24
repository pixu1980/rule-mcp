/**
 * @module modules/bookmarks/bookmarks.controller
 *
 * Extracts and validates input, delegates to the service layer, and shapes
 * HTTP responses. No business logic lives here.
 */

import type { Request, Response } from "express";
import {
  bookmarkIdParamsSchema,
  createBookmarkSchema,
  listBookmarksQuerySchema,
} from "./bookmarks.schema.js";
import * as bookmarksService from "./bookmarks.service.js";
import { AppError } from "../../common/errors/AppError.js";

/** POST /api/v1/bookmarks, scrape and save a new bookmark. */
export async function createBookmarkHandler(req: Request, res: Response): Promise<void> {
  const parsed = createBookmarkSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid request body.", parsed.error.flatten());
  }

  const bookmark = await bookmarksService.createBookmark(parsed.data.url);
  res.status(201).json(bookmark);
}

/** GET /api/v1/bookmarks, paginated list of bookmarks. */
export function listBookmarksHandler(req: Request, res: Response): void {
  const parsed = listBookmarksQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid query parameters.", parsed.error.flatten());
  }

  const { offset, limit } = parsed.data;
  const { items, total } = bookmarksService.listBookmarks(offset, limit);
  res.setHeader("X-Total-Count", String(total));
  res.status(200).json(items);
}

/** GET /api/v1/bookmarks/:id, fetch a single bookmark. */
export function getBookmarkHandler(req: Request, res: Response): void {
  const parsed = bookmarkIdParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid bookmark id.", parsed.error.flatten());
  }
  res.status(200).json(bookmarksService.getBookmark(parsed.data.id));
}

/** DELETE /api/v1/bookmarks/:id, remove a bookmark. */
export function deleteBookmarkHandler(req: Request, res: Response): void {
  const parsed = bookmarkIdParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid bookmark id.", parsed.error.flatten());
  }
  bookmarksService.deleteBookmark(parsed.data.id);
  res.status(204).send();
}
