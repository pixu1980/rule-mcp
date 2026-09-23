/**
 * @module types
 * Shared type definitions matching the backend API.
 */

/** Bookmark resource from the API */
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

/** Paginated API response */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  offset: number;
  limit: number;
}

/** Request body for creating a bookmark */
export interface CreateBookmarkRequest {
  url: string;
}

/** API error item */
export interface ApiErrorItem {
  code: number;
  message: string;
  details?: unknown;
}

/** API error response */
export interface ApiErrorResponse {
  statusCode: number;
  errors: ApiErrorItem[];
}
