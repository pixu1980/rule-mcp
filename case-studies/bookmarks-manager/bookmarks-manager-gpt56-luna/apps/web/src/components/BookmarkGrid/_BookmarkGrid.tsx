/** Accessible library list with stable bookmark keys and an intentional empty state. */
import type { Bookmark } from "../../types/api";
import { BookmarkCard } from "../BookmarkCard";

export function BookmarkGrid({ bookmarks }: { bookmarks: Bookmark[] }) {
  return bookmarks.length > 0 ? (
    <ul data-part="bookmark-grid" aria-label="Saved bookmarks">
      {bookmarks.map((bookmark) => (
        <BookmarkCard key={bookmark.id} bookmark={bookmark} />
      ))}
    </ul>
  ) : (
    <p data-part="empty-state">
      Your library is waiting for its first good link.
    </p>
  );
}
