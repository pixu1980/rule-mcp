/** Typed API client with runtime validation at the network boundary. */
import { z } from "zod";
import {
  type Bookmark,
  type BookmarkPreview,
  bookmarkPreviewSchema,
  bookmarkResponseSchema,
} from "../types/api";

export { bookmarkResponseSchema } from "../types/api";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

/** Build a normalized create/preview payload from pasted text. */
export function buildBookmarkPayload(url: string): { url: string } {
  return { url: url.trim() };
}

async function request<T>(
  path: string,
  init: RequestInit,
  schema: z.ZodType<T>,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      errors?: Array<{ message?: string }>;
    } | null;
    throw new Error(body?.errors?.[0]?.message ?? "Unable to reach Luma API");
  }
  return schema.parse(await response.json());
}

/** Request scraped metadata without persisting it. */
export function previewBookmark(url: string): Promise<BookmarkPreview> {
  return request(
    "/api/v1/bookmarks/preview",
    { method: "POST", body: JSON.stringify(buildBookmarkPayload(url)) },
    bookmarkPreviewSchema,
  );
}

/** Persist a bookmark after the user approves its preview. */
export function saveBookmark(url: string): Promise<Bookmark> {
  return request(
    "/api/v1/bookmarks",
    { method: "POST", body: JSON.stringify(buildBookmarkPayload(url)) },
    bookmarkResponseSchema,
  );
}

/** Load the newest saved bookmarks. */
export function listBookmarks(): Promise<Bookmark[]> {
  return request(
    "/api/v1/bookmarks?offset=0&limit=20",
    { method: "GET" },
    z.array(bookmarkResponseSchema),
  );
}
