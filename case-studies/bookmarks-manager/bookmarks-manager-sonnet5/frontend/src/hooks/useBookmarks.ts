/**
 * @module hooks/useBookmarks
 *
 * Owns all bookmark data and the submission lifecycle for the composer.
 * Two independent pieces of state are modeled as discriminated unions via
 * `useReducer` — the bookmark list load state and the create-bookmark
 * submission state — so "loading + error" or "success + error" can never
 * coexist inconsistently.
 */

import { useCallback, useEffect, useReducer } from "react";
import { ApiError, createBookmark, deleteBookmark, fetchBookmarks } from "../services/api";
import type { Bookmark } from "../types/api";

interface ListState {
  status: "loading" | "ready" | "error";
  bookmarks: Bookmark[];
  errorMessage: string | null;
}

type ListAction =
  | { type: "list/loading" }
  | { type: "list/success"; bookmarks: Bookmark[] }
  | { type: "list/error"; message: string }
  | { type: "list/prepend"; bookmark: Bookmark }
  | { type: "list/remove"; id: string };

function listReducer(state: ListState, action: ListAction): ListState {
  switch (action.type) {
    case "list/loading":
      return { ...state, status: "loading", errorMessage: null };
    case "list/success":
      return { status: "ready", bookmarks: action.bookmarks, errorMessage: null };
    case "list/error":
      return { ...state, status: "error", errorMessage: action.message };
    case "list/prepend":
      return { ...state, bookmarks: [action.bookmark, ...state.bookmarks] };
    case "list/remove":
      return { ...state, bookmarks: state.bookmarks.filter((b) => b.id !== action.id) };
    default:
      return state;
  }
}

type ComposerState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string };

type ComposerAction =
  | { type: "composer/submit" }
  | { type: "composer/success" }
  | { type: "composer/error"; message: string }
  | { type: "composer/dismiss" };

function composerReducer(_state: ComposerState, action: ComposerAction): ComposerState {
  switch (action.type) {
    case "composer/submit":
      return { status: "submitting" };
    case "composer/success":
      return { status: "idle" };
    case "composer/error":
      return { status: "error", message: action.message };
    case "composer/dismiss":
      return { status: "idle" };
    default:
      return { status: "idle" };
  }
}

/** Maps a thrown error into a short, user-facing message. */
function toMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

/**
 * Loads the bookmark list on mount and exposes create/delete actions with
 * optimistic-free, reducer-backed loading/error state for both the list and
 * the composer submission.
 */
export function useBookmarks() {
  const [listState, dispatchList] = useReducer(listReducer, {
    status: "loading",
    bookmarks: [],
    errorMessage: null,
  });
  const [composerState, dispatchComposer] = useReducer(composerReducer, { status: "idle" });

  useEffect(() => {
    let cancelled = false;
    dispatchList({ type: "list/loading" });
    fetchBookmarks()
      .then((bookmarks) => {
        if (!cancelled) dispatchList({ type: "list/success", bookmarks });
      })
      .catch((error: unknown) => {
        if (!cancelled) dispatchList({ type: "list/error", message: toMessage(error) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const submitUrl = useCallback(async (url: string) => {
    dispatchComposer({ type: "composer/submit" });
    try {
      const bookmark = await createBookmark(url);
      dispatchList({ type: "list/prepend", bookmark });
      dispatchComposer({ type: "composer/success" });
    } catch (error) {
      dispatchComposer({ type: "composer/error", message: toMessage(error) });
    }
  }, []);

  const removeBookmark = useCallback(async (id: string) => {
    try {
      await deleteBookmark(id);
      dispatchList({ type: "list/remove", id });
    } catch (error) {
      dispatchList({ type: "list/error", message: toMessage(error) });
    }
  }, []);

  const dismissComposerError = useCallback(() => dispatchComposer({ type: "composer/dismiss" }), []);

  return {
    bookmarks: listState.bookmarks,
    listStatus: listState.status,
    listErrorMessage: listState.errorMessage,
    composerState,
    submitUrl,
    removeBookmark,
    dismissComposerError,
  };
}
