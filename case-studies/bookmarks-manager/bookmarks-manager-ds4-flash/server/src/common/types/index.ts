/**
 * @module common/types
 * Shared type definitions for the server.
 */

/** Bookmark resource */
export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description: string;
  ogImage: string;
  domain: string;
  createdAt: string;
  updatedAt: string;
}

/** Scraped metadata from a URL */
export interface ScrapedMetadata {
  url: string;
  title: string;
  description: string;
  ogImage: string;
  domain: string;
  textPreview: string;
}

/** API error response item */
export interface ApiErrorItem {
  code: number;
  message: string;
  details?: unknown;
}

/** API error response */
export interface ApiErrorResponse {
  statusCode: number;
  correlationId?: string;
  errors: ApiErrorItem[];
}

/** Paginated API response */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  offset: number;
  limit: number;
}
