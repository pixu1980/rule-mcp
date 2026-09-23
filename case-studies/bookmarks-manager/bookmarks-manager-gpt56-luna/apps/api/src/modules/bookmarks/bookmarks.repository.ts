/** In-memory bookmark repository for local development and demos. */
import type { Bookmark, BookmarkMetadata } from "../../types.js";

const seed: Bookmark = {
  id: "seed-quiet-atlas",
  url: "https://www.nationalgeographic.com/travel/article/slow-travel",
  title: "The quiet atlas",
  description:
    "Notes on travelling slowly, noticing more, and leaving room for wonder.",
  image: null,
  domain: "nationalgeographic.com",
  preview:
    "A small field guide to slower journeys: walk the long way, notice the light, and let a place set the pace.",
  createdAt: "2026-07-11T09:00:00.000Z",
};

/** Simple persistence boundary; replace with SQLite/Postgres without changing routes. */
export class BookmarksRepository {
  private readonly bookmarks: Bookmark[] = [seed];

  list(offset = 0, limit = 20): { items: Bookmark[]; total: number } {
    return {
      items: this.bookmarks.slice(offset, offset + limit),
      total: this.bookmarks.length,
    };
  }

  create(url: string, metadata: BookmarkMetadata): Bookmark {
    const bookmark: Bookmark = {
      id: crypto.randomUUID(),
      url,
      ...metadata,
      createdAt: new Date().toISOString(),
    };
    this.bookmarks.unshift(bookmark);
    return bookmark;
  }
}
