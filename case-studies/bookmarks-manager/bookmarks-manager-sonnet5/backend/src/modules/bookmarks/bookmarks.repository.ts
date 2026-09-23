/**
 * @module modules/bookmarks/bookmarks.repository
 *
 * In-memory data access for bookmarks. Isolated behind this module so a
 * future persistent store (Postgres, SQLite, ...) can replace it without
 * touching the service or controller layers.
 */

import type { Bookmark } from "./bookmarks.types.js";

const store = new Map<string, Bookmark>();

/** Inserts a bookmark, keyed by its id. */
export function insert(bookmark: Bookmark): Bookmark {
  store.set(bookmark.id, bookmark);
  return bookmark;
}

/**
 * Returns a page of bookmarks ordered newest-first, plus the total count
 * for pagination headers.
 */
export function list(offset: number, limit: number): { items: Bookmark[]; total: number } {
  const all = Array.from(store.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { items: all.slice(offset, offset + limit), total: all.length };
}

/** Finds a single bookmark by id, or `undefined` when absent. */
export function findById(id: string): Bookmark | undefined {
  return store.get(id);
}

/** Deletes a bookmark by id. @returns whether a bookmark was removed. */
export function remove(id: string): boolean {
  return store.delete(id);
}

/** Returns true when a bookmark with the exact same URL already exists. */
export function findByUrl(url: string): Bookmark | undefined {
  return Array.from(store.values()).find((bookmark) => bookmark.url === url);
}

/** Test-only helper to reset state between test cases. */
export function _clear(): void {
  store.clear();
}
