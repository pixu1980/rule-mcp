/**
 * @module components/Layout/_Layout
 *
 * Page chrome: skip link target, masthead with the product name and
 * tagline, the `<main>` landmark for page content, and a minimal footer.
 * Keeps exactly one `<h1>` for the whole page, satisfying the WCAG
 * one-heading-one-page rule.
 */

import type { ReactNode } from "react";
import cssText from "./_Layout.css?raw";
import { useAdoptedStylesheet } from "../../hooks/useAdoptedStylesheet";

interface LayoutProps {
  children: ReactNode;
}

/** Wraps page content with masthead, `<main>` landmark, and footer. */
export function Layout({ children }: LayoutProps) {
  useAdoptedStylesheet(cssText);

  return (
    <>
      <a data-part="skip-link" href="#main-content">
        Skip to content
      </a>
      <header data-part="masthead">
        <p data-part="eyebrow">Bookmarks</p>
        <h1>Save any link, instantly previewed</h1>
        <p data-part="tagline">Paste a URL below — we fetch its title, image and a short excerpt for you.</p>
      </header>
      <main id="main-content" data-part="content" tabIndex={-1}>
        {children}
      </main>
      <footer data-part="site-footer">
        <p>Bookmarks Manager — a rule-mcp proof of concept.</p>
      </footer>
    </>
  );
}
