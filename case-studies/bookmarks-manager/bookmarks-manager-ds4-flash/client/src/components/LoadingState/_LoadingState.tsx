/**
 * @module components/LoadingState/_LoadingState
 * Loading spinner shown while fetching bookmarks.
 */

import { useEffect, useRef } from "react";
import cssText from "./_LoadingState.css?inline";

const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

export function LoadingState() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (ref.current) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }
  }, []);

  return (
    <section ref={ref} data-part="loading-state" aria-label="Loading bookmarks" role="status">
      <div data-part="loading-spinner" aria-hidden="true" />
      <p data-part="loading-text">Loading bookmarks…</p>
    </section>
  );
}
