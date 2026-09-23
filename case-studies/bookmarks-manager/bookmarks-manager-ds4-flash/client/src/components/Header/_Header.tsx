/**
 * @module components/Header/_Header
 * Sticky app header with logo and bookmark count.
 */

import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import cssText from "./_Header.css?inline";

const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

export function Header() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (ref.current) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }
  }, []);

  return (
    <header ref={ref} data-part="app-header">
      <Link to="/" data-part="logo">
        <svg
          data-part="logo-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 2v12a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4V2" />
          <path d="M2 6h20" />
          <path d="M10 10h4" />
          <path d="M12 22v-4" />
        </svg>
        <span>Bookmarks</span>
      </Link>
    </header>
  );
}
