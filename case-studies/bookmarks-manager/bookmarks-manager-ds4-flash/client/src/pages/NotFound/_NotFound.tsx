/**
 * @module pages/NotFound/_NotFound
 * 404 page for unknown routes.
 */

import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import cssText from "./_NotFound.css?inline";

const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

export function NotFound() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (ref.current) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }
  }, []);

  useEffect(() => {
    document.title = "404 — Not Found";
  }, []);

  return (
    <section ref={ref} data-part="not-found" aria-label="Page not found">
      <p data-part="not-found-code">404</p>
      <h1 data-part="not-found-title">Page not found</h1>
      <p data-part="not-found-text">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link to="/" data-part="not-found-link">
        Back to bookmarks
      </Link>
    </section>
  );
}
