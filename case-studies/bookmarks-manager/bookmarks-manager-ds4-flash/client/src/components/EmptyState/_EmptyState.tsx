/**
 * @module components/EmptyState/_EmptyState
 * Empty state shown when there are no bookmarks.
 */

import { useEffect, useRef } from "react";
import cssText from "./_EmptyState.css?inline";

const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

export function EmptyState() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (ref.current) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }
  }, []);

  return (
    <section ref={ref} data-part="empty-state" aria-label="No bookmarks yet">
      <svg data-part="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 2v12a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4V2" />
        <path d="M2 6h20" />
        <path d="M10 10h4" />
      </svg>
      <p data-part="empty-title">No bookmarks yet</p>
      <p data-part="empty-text">
        Paste a URL above to scrape its metadata and save it as a bookmark.
        Your bookmarks will appear here with their title, description, and preview image.
      </p>
    </section>
  );
}
