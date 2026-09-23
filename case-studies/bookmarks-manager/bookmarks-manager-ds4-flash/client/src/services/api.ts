/**
 * @module services/api
 * Typed API layer for the bookmarks backend.
 */

import type { Bookmark, PaginatedResponse, CreateBookmarkRequest } from "../types/index.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

/** Custom API error */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public errors: Array<{ code: number; message: string }>,
  ) {
    super(errors[0]?.message ?? "API error");
    this.name = "ApiError";
  }
}

/** Generic fetch wrapper */
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ errors: [{ code: res.status * 100, message: res.statusText }] }));
    throw new ApiError(res.status, body.errors);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

/** Fetch bookmarks with pagination */
export function fetchBookmarks(offset = 0, limit = 20): Promise<PaginatedResponse<Bookmark>> {
  return apiFetch<PaginatedResponse<Bookmark>>(`/bookmarks?offset=${offset}&limit=${limit}`);
}

/** Create a bookmark by URL (triggers scraping) */
export function createBookmark(data: CreateBookmarkRequest): Promise<Bookmark> {
  return apiFetch<Bookmark>("/bookmarks", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Delete a bookmark */
export function deleteBookmark(id: string): Promise<void> {
  return apiFetch<void>(`/bookmarks/${id}`, { method: "DELETE" });
}
