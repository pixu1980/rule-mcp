/**
 * @module pages/Home/_Home
 * Home page: search bar + bookmark list.
 */

import { useEffect, useRef, useCallback } from "react";
import { SearchBar } from "../../components/SearchBar/_SearchBar.js";
import { BookmarkCard } from "../../components/BookmarkCard/_BookmarkCard.js";
import { EmptyState } from "../../components/EmptyState/_EmptyState.js";
import { LoadingState } from "../../components/LoadingState/_LoadingState.js";
import { useBookmarks } from "../../hooks/useBookmarks.js";
import cssText from "./_Home.css?inline";

const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

export function Home() {
  const ref = useRef<HTMLElement>(null);
  const { bookmarks, total, loading, error, submitting, addBookmark, removeBookmark } =
    useBookmarks();

  useEffect(() => {
    if (ref.current) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }
  }, []);

  const handleSubmit = useCallback(
    async (url: string) => {
      await addBookmark(url);
    },
    [addBookmark],
  );

  return (
    <section ref={ref} data-part="home-page">
      <SearchBar onSubmit={handleSubmit} submitting={submitting} error={error} />

      {loading ? (
        <LoadingState />
      ) : bookmarks.length === 0 ? (
        <EmptyState />
      ) : (
        <section data-part="bookmark-list" aria-label="Saved bookmarks">
          <div data-part="list-header">
            <h2 data-part="list-title">
              Saved ({total})
            </h2>
          </div>
          {bookmarks.map((bookmark, index) => (
            <BookmarkCard
              key={bookmark.id}
              bookmark={bookmark}
              index={index}
              onDelete={removeBookmark}
            />
          ))}
        </section>
      )}
    </section>
  );
}
