/**
 * @module types/api
 *
 * Mirrors the backend's `Bookmark` contract (see
 * `backend/src/modules/bookmarks/bookmarks.types.ts`) so the frontend has a
 * single, typed source of truth for API payloads.
 */

/** A bookmark enriched with metadata scraped from its target URL. */
export interface Bookmark {
  id: string;
  url: string;
  canonicalUrl: string | null;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  faviconUrl: string | null;
  siteName: string | null;
  textPreview: string | null;
  createdAt: string;
}

/** Structured error body returned by every failing API response. */
export interface ApiErrorBody {
  statusCode: number;
  correlationId: string;
  errors: Array<{ code: string; message: string; details?: unknown }>;
}
