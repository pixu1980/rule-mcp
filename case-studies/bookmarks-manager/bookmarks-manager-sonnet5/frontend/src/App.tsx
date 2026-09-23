/**
 * @module App
 *
 * Root component: wires the {@link useBookmarks} hook to the composer,
 * a polite live-region announcement, and the bookmark grid.
 */

import { useEffect, useState } from "react";
import { Layout } from "./components/Layout";
import { BookmarkComposer } from "./components/BookmarkComposer";
import { BookmarkGrid } from "./components/BookmarkGrid";
import { Toast } from "./components/Toast";
import { useBookmarks } from "./hooks/useBookmarks";

/** Application root. */
export function App() {
  const {
    bookmarks,
    listStatus,
    listErrorMessage,
    composerState,
    submitUrl,
    removeBookmark,
    dismissComposerError,
  } = useBookmarks();

  const [announcement, setAnnouncement] = useState("");
  const [listErrorDismissed, setListErrorDismissed] = useState(false);

  // Politely announce count changes for screen reader users — no visual
  // toast is needed for a routine success, just a live-region confirmation.
  useEffect(() => {
    if (listStatus === "ready") {
      setAnnouncement(
        bookmarks.length === 0
          ? "No bookmarks saved yet."
          : `${bookmarks.length} bookmark${bookmarks.length === 1 ? "" : "s"} saved.`,
      );
    }
  }, [bookmarks.length, listStatus]);

  return (
    <Layout>
      <BookmarkComposer
        status={composerState.status}
        errorMessage={composerState.status === "error" ? composerState.message : null}
        onSubmit={submitUrl}
        onDismissError={dismissComposerError}
      />
      <p aria-live="polite" data-part="visually-hidden">
        {announcement}
      </p>
      {listStatus === "error" && listErrorMessage && !listErrorDismissed && (
        <Toast tone="error" onDismiss={() => setListErrorDismissed(true)}>
          {listErrorMessage}
        </Toast>
      )}
      <BookmarkGrid bookmarks={bookmarks} status={listStatus} onRemove={removeBookmark} />
    </Layout>
  );
}
