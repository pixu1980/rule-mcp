/** Application shell with persistent product navigation and status context. */
import type { PropsWithChildren } from "react";

export function Layout({ children }: PropsWithChildren) {
  return (
    <>
      <header data-part="topbar">
        <a data-part="brand" href="/" aria-label="Luma home">
          <span data-part="brand-mark" aria-hidden="true">
            ✦
          </span>
          <span>Luma</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#library">Library</a>
          <a href="#about">About</a>
        </nav>
        <button
          data-part="profile"
          type="button"
          aria-label="Open profile menu"
        >
          EP
        </button>
      </header>
      {children}
      <footer data-part="footer" id="about">
        <p>
          <strong>Luma</strong> keeps the internet’s good bits within reach.
        </p>
        <p data-part="footer-meta">
          Private by design · Built for slow browsing
        </p>
      </footer>
    </>
  );
}
