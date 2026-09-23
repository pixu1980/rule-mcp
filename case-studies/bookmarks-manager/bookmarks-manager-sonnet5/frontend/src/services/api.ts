/**
 * @module services/api
 *
 * Thin, typed fetch wrapper for the bookmarks API. Every network call in the
 * app goes through this module so error shaping and the base URL are
 * defined in exactly one place.
 */

import type { ApiErrorBody, Bookmark } from "../types/api";

const BASE_URL = "/api/v1";

/** Error thrown for any non-2xx API response, carrying the parsed body. */
export class ApiError extends Error {
  public readonly status: number;
  public readonly body: ApiErrorBody | null;

  constructor(status: number, body: ApiErrorBody | null) {
    super(body?.errors[0]?.message ?? `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Performs a fetch against the bookmarks API and parses the JSON response,
 * throwing {@link ApiError} for non-2xx statuses.
 */
async function request<T>(path: string, init?: RequestInit): Promise<{ data: T; headers: Headers }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(res.status, body);
  }

  if (res.status === 204) {
    return { data: undefined as T, headers: res.headers };
  }

  const data = (await res.json()) as T;
  return { data, headers: res.headers };
}

/** Fetches a page of bookmarks, newest first. */
export async function fetchBookmarks(): Promise<Bookmark[]> {
  const { data } = await request<Bookmark[]>("/bookmarks?limit=100");
  return data;
}

/** Submits a URL to be scraped and saved as a new bookmark. */
export async function createBookmark(url: string): Promise<Bookmark> {
  const { data } = await request<Bookmark>("/bookmarks", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
  return data;
}

/** Deletes a bookmark by id. */
export async function deleteBookmark(id: string): Promise<void> {
  await request<void>(`/bookmarks/${id}`, { method: "DELETE" });
}
