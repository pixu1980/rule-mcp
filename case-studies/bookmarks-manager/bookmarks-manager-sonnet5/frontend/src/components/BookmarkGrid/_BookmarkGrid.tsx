/**
 * @module components/BookmarkGrid/_BookmarkGrid
 *
 * Renders the bookmark collection: a skeleton grid while the initial list
 * request is in flight, the {@link EmptyState} once loaded with zero
 * bookmarks, or the list of {@link BookmarkCard}s.
 */

import cssText from "./_BookmarkGrid.css?raw";
import { useAdoptedStylesheet } from "../../hooks/useAdoptedStylesheet";
import { BookmarkCard } from "../BookmarkCard";
import { EmptyState } from "../EmptyState";
import type { Bookmark } from "../../types/api";

interface BookmarkGridProps {
  bookmarks: Bookmark[];
  status: "loading" | "ready" | "error";
  onRemove: (id: string) => void;
}

const SKELETON_COUNT = 6;

/** Bookmark collection: skeleton, empty state, or the card grid. */
export function BookmarkGrid({ bookmarks, status, onRemove }: BookmarkGridProps) {
  useAdoptedStylesheet(cssText);

  if (status === "loading") {
    return (
      <ul data-part="grid" aria-busy="true" aria-label="Loading bookmarks">
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          <li key={index} data-part="skeleton-item">
            <span data-part="skeleton-card" aria-hidden="true" />
          </li>
        ))}
      </ul>
    );
  }

  if (status === "ready" && bookmarks.length === 0) {
    return <EmptyState />;
  }

  return (
    <ul data-part="grid" aria-label="Saved bookmarks">
      {bookmarks.map((bookmark) => (
        <li key={bookmark.id} data-part="grid-item">
          <BookmarkCard bookmark={bookmark} onRemove={onRemove} />
        </li>
      ))}
    </ul>
  );
}
