/** Shared backend domain types for bookmark capture and rendering. */
export interface BookmarkMetadata {
  title: string;
  description: string;
  image: string | null;
  domain: string;
  preview: string;
}

/** A bookmark persisted by the in-memory repository. */
export interface Bookmark extends BookmarkMetadata {
  id: string;
  url: string;
  createdAt: string;
}
