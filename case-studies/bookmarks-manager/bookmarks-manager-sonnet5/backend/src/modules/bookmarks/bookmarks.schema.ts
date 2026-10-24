/**
 * @module modules/bookmarks/bookmarks.schema
 *
 * Zod request schemas for the bookmarks endpoints. Every external input
 * (body, query, params) is validated here before it reaches a controller.
 */

import { z } from "zod";

/** POST /api/v1/bookmarks body, the URL to scrape and save. */
export const createBookmarkSchema = z.object({
  url: z
    .string({ required_error: "url is required" })
    .trim()
    .min(1, "url is required")
    .max(2048, "url is too long"),
});

export type CreateBookmarkInput = z.infer<typeof createBookmarkSchema>;

/** GET /api/v1/bookmarks query, pagination. */
export const listBookmarksQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListBookmarksQuery = z.infer<typeof listBookmarksQuerySchema>;

/** DELETE/GET /api/v1/bookmarks/:id params. */
export const bookmarkIdParamsSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
});
