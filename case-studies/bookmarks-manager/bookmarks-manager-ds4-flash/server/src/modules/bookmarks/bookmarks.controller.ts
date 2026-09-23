/**
 * @module modules/bookmarks/bookmarks.controller
 * Request handlers for bookmarks endpoints.
 */

import type { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../common/middleware/error-handler.js";
import * as bookmarksService from "./bookmarks.service.js";

const createBookmarkSchema = z.object({
  url: z.string().url("URL must be a valid URL"),
});

const paginationSchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** GET /api/v1/bookmarks */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = paginationSchema.parse(req.query);
  const result = bookmarksService.listBookmarks(query.offset, query.limit);
  res.setHeader("X-Total-Count", String(result.total));
  res.status(200).json(result);
});

/** GET /api/v1/bookmarks/:id */
export const get = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id ?? "");
  const bookmark = bookmarksService.getBookmark(id);
  res.status(200).json(bookmark);
});

/** POST /api/v1/bookmarks */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const { url } = createBookmarkSchema.parse(req.body);
  const bookmark = await bookmarksService.createBookmark(url);
  res.status(201).json(bookmark);
});

/** DELETE /api/v1/bookmarks/:id */
export const remove = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id ?? "");
  bookmarksService.deleteBookmark(id);
  res.status(204).send();
});
