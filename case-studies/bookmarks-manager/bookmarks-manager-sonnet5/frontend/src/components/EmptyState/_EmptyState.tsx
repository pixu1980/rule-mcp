/**
 * @module components/EmptyState/_EmptyState
 *
 * Friendly placeholder shown before the first bookmark is saved.
 */

import cssText from "./_EmptyState.css?raw";
import { useAdoptedStylesheet } from "../../hooks/useAdoptedStylesheet";

/** Shown when the bookmark list is empty. */
export function EmptyState() {
  useAdoptedStylesheet(cssText);

  return (
    <section data-part="empty-state" aria-label="No bookmarks yet">
      <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true" focusable="false">
        <path
          d="M12 6h24a2 2 0 0 1 2 2v34l-14-8-14 8V8a2 2 0 0 1 2-2Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      <h2>No bookmarks yet</h2>
      <p>Paste a link above to save your first one — we'll fetch its preview automatically.</p>
    </section>
  );
}
