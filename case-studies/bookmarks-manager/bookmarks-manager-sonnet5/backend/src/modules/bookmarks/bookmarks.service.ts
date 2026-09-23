/**
 * @module modules/bookmarks/bookmarks.service
 *
 * Business logic for the bookmarks domain: validates the target URL is safe
 * to fetch, scrapes it, and persists the resulting bookmark. Pure
 * orchestration — no Express types leak into this layer.
 */

import { randomUUID } from "node:crypto";
import { AppError } from "../../common/errors/AppError.js";
import { assertSafeUrl } from "../../common/utils/ssrfGuard.js";
import { scrapeUrl } from "../../scraping/scrape.service.js";
import * as bookmarksRepository from "./bookmarks.repository.js";
import type { Bookmark } from "./bookmarks.types.js";

/**
 * Validates, scrapes, and persists a new bookmark for `rawUrl`.
 *
 * @throws {AppError} `URL_NOT_ALLOWED` for unsafe/invalid URLs, or errors
 * bubbled up from {@link scrapeUrl} for fetch failures.
 */
export async function createBookmark(rawUrl: string): Promise<Bookmark> {
  const existing = bookmarksRepository.findByUrl(rawUrl);
  if (existing) return existing;

  const safeUrl = await assertSafeUrl(rawUrl);
  const metadata = await scrapeUrl(safeUrl);

  const bookmark: Bookmark = {
    id: randomUUID(),
    url: rawUrl,
    createdAt: new Date().toISOString(),
    ...metadata,
  };

  return bookmarksRepository.insert(bookmark);
}

/** Returns a paginated list of saved bookmarks, newest first. */
export function listBookmarks(offset: number, limit: number): { items: Bookmark[]; total: number } {
  return bookmarksRepository.list(offset, limit);
}

/**
 * Fetches a single bookmark by id.
 *
 * @throws {AppError} `BOOKMARK_NOT_FOUND` when no bookmark matches.
 */
export function getBookmark(id: string): Bookmark {
  const bookmark = bookmarksRepository.findById(id);
  if (!bookmark) {
    throw new AppError(404, "BOOKMARK_NOT_FOUND", `No bookmark found with id ${id}.`);
  }
  return bookmark;
}

/**
 * Deletes a bookmark by id.
 *
 * @throws {AppError} `BOOKMARK_NOT_FOUND` when no bookmark matches.
 */
export function deleteBookmark(id: string): void {
  const removed = bookmarksRepository.remove(id);
  if (!removed) {
    throw new AppError(404, "BOOKMARK_NOT_FOUND", `No bookmark found with id ${id}.`);
  }
}
