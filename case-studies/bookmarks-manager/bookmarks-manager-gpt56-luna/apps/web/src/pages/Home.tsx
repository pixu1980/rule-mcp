/** Main capture-to-library experience for the Luma bookmarks manager. */
import { useEffect, useReducer } from "react";
import { BookmarkGrid } from "../components/BookmarkGrid";
import { Layout } from "../components/Layout";
import { LinkCapture } from "../components/LinkCapture";
import { PreviewPanel } from "../components/PreviewPanel";
import { listBookmarks, previewBookmark, saveBookmark } from "../services/api";
import type { Bookmark, BookmarkPreview } from "../types/api";

const FALLBACK_BOOKMARK: Bookmark = {
  id: "seed-quiet-atlas",
  url: "https://www.nationalgeographic.com/travel/article/slow-travel",
  title: "The quiet atlas",
  description:
    "Notes on travelling slowly, noticing more, and leaving room for wonder.",
  image: null,
  domain: "nationalgeographic.com",
  preview:
    "A small field guide to slower journeys: walk the long way, notice the light, and let a place set the pace.",
  createdAt: "2026-07-11T09:00:00.000Z",
};

type CaptureState = {
  status: "idle" | "loading" | "error" | "ready" | "saving";
  error: string | null;
  preview: BookmarkPreview | null;
};
type CaptureAction =
  | { type: "loading" }
  | { type: "ready"; preview: BookmarkPreview }
  | { type: "error"; error: string }
  | { type: "saving" }
  | { type: "idle" };
const initialCapture: CaptureState = {
  status: "idle",
  error: null,
  preview: null,
};
function captureReducer(
  state: CaptureState,
  action: CaptureAction,
): CaptureState {
  if (action.type === "loading")
    return { status: "loading", error: null, preview: null };
  if (action.type === "ready")
    return { status: "ready", error: null, preview: action.preview };
  if (action.type === "saving")
    return { ...state, status: "saving", error: null };
  if (action.type === "error")
    return { ...state, status: "error", error: action.error };
  return initialCapture;
}

export function Home() {
  const [bookmarks, setBookmarks] = useReducer(
    (
      state: Bookmark[],
      next: Bookmark[] | { type: "prepend"; bookmark: Bookmark },
    ) => (Array.isArray(next) ? next : [next.bookmark, ...state]),
    [FALLBACK_BOOKMARK],
  );
  const [capture, dispatch] = useReducer(captureReducer, initialCapture);

  useEffect(() => {
    listBookmarks()
      .then(setBookmarks)
      .catch(() => undefined);
  }, []);

  async function handlePreview(url: string) {
    dispatch({ type: "loading" });
    try {
      dispatch({ type: "ready", preview: await previewBookmark(url) });
    } catch (error) {
      dispatch({
        type: "error",
        error:
          error instanceof Error ? error.message : "Could not read that link",
      });
    }
  }

  async function handleSave() {
    if (!capture.preview) return;
    dispatch({ type: "saving" });
    try {
      setBookmarks({
        type: "prepend",
        bookmark: await saveBookmark(capture.preview.url),
      });
      dispatch({ type: "idle" });
    } catch (error) {
      dispatch({
        type: "error",
        error:
          error instanceof Error ? error.message : "Could not save that link",
      });
    }
  }

  return (
    <Layout>
      <main>
        <section data-part="hero" aria-labelledby="hero-heading">
          <p data-part="eyebrow">Your considered corner of the web</p>
          <h1 id="hero-heading">
            Save what
            <br />
            <em>matters.</em>
          </h1>
          <p data-part="hero-copy">
            One link at a time, build a library that feels like you. Luma reads
            the page so you can decide if it belongs.
          </p>
          <LinkCapture
            isLoading={capture.status === "loading"}
            error={capture.error}
            onPreview={handlePreview}
          />
          <p data-part="privacy-note">
            <span aria-hidden="true">◌</span> No accounts. No tracking. Just
            your links.
          </p>
        </section>
        {capture.preview && (
          <section data-part="preview-region" aria-live="polite">
            <PreviewPanel
              preview={capture.preview}
              isSaving={capture.status === "saving"}
              onSave={handleSave}
              onDismiss={() => dispatch({ type: "idle" })}
            />
          </section>
        )}
        <section
          data-part="library"
          id="library"
          aria-labelledby="library-heading"
        >
          <header data-part="section-heading">
            <section>
              <p data-part="eyebrow">The collection</p>
              <h2 id="library-heading">Recently saved</h2>
            </section>
            <span data-part="count">
              {bookmarks.length} {bookmarks.length === 1 ? "link" : "links"}
            </span>
          </header>
          <BookmarkGrid bookmarks={bookmarks} />
        </section>
      </main>
    </Layout>
  );
}
