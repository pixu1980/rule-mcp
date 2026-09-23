/** Resource-oriented routes for bookmark previews and persistence. */
import { Router } from "express";
import { AppError } from "../../common/error.js";
import { fetchBookmarkMetadata } from "../scrape/scraper.service.js";
import { BookmarksRepository } from "./bookmarks.repository.js";
import { bookmarkInputSchema, paginationSchema } from "./bookmarks.schemas.js";

export function createBookmarksRouter(
  repository = new BookmarksRepository(),
): Router {
  const router = Router();

  router.get("/", (request, response) => {
    const { offset, limit } = paginationSchema.parse(request.query);
    const result = repository.list(offset, limit);
    response.setHeader("X-Total-Count", result.total);
    response.json(result.items);
  });

  router.post("/preview", async (request, response, next) => {
    try {
      const { url } = bookmarkInputSchema.parse(request.body);
      response.status(200).json({ url, ...(await fetchBookmarkMetadata(url)) });
    } catch (error) {
      next(
        error instanceof Error && error.message === "URL_NOT_ALLOWED"
          ? new AppError(
              400,
              "URL_NOT_ALLOWED",
              "Only public HTTP(S) URLs are supported",
            )
          : error,
      );
    }
  });

  router.post("/", async (request, response, next) => {
    try {
      const { url } = bookmarkInputSchema.parse(request.body);
      const bookmark = repository.create(url, await fetchBookmarkMetadata(url));
      response.status(201).json(bookmark);
    } catch (error) {
      next(
        error instanceof Error && error.message === "URL_NOT_ALLOWED"
          ? new AppError(
              400,
              "URL_NOT_ALLOWED",
              "Only public HTTP(S) URLs are supported",
            )
          : error,
      );
    }
  });

  return router;
}
