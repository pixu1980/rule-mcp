/**
 * @module modules/bookmarks/bookmarks.types
 *
 * Shared TypeScript types for the bookmarks domain, mirrored by the frontend
 * `src/types/api.ts` contract.
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

/** Metadata extracted from a fetched HTML document, before persistence. */
export interface ScrapedMetadata {
  canonicalUrl: string | null;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  faviconUrl: string | null;
  siteName: string | null;
  textPreview: string | null;
}
