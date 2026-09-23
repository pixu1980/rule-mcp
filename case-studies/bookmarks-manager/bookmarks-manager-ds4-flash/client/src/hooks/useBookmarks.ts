/**
 * @module hooks/useBookmarks
 * Hook for managing bookmarks state.
 */

import { useState, useCallback, useEffect } from "react";
import type { Bookmark } from "../types/index.js";
import * as api from "../services/api.js";

interface BookmarkState {
  bookmarks: Bookmark[];
  total: number;
  loading: boolean;
  error: string | null;
  submitting: boolean;
}

export function useBookmarks() {
  const [state, setState] = useState<BookmarkState>({
    bookmarks: [],
    total: 0,
    loading: true,
    error: null,
    submitting: false,
  });

  const loadBookmarks = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await api.fetchBookmarks();
      setState((prev) => ({
        ...prev,
        bookmarks: result.data,
        total: result.total,
        loading: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load bookmarks",
      }));
    }
  }, []);

  const addBookmark = useCallback(async (url: string) => {
    setState((prev) => ({ ...prev, submitting: true, error: null }));
    try {
      const bookmark = await api.createBookmark({ url });
      setState((prev) => ({
        ...prev,
        bookmarks: [bookmark, ...prev.bookmarks],
        total: prev.total + 1,
        submitting: false,
      }));
      return bookmark;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        submitting: false,
        error: err instanceof Error ? err.message : "Failed to create bookmark",
      }));
      return null;
    }
  }, []);

  const removeBookmark = useCallback(async (id: string) => {
    setState((prev) => ({ ...prev, error: null }));
    try {
      await api.deleteBookmark(id);
      setState((prev) => ({
        ...prev,
        bookmarks: prev.bookmarks.filter((b) => b.id !== id),
        total: prev.total - 1,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to delete bookmark",
      }));
    }
  }, []);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  return {
    ...state,
    loadBookmarks,
    addBookmark,
    removeBookmark,
  };
}
