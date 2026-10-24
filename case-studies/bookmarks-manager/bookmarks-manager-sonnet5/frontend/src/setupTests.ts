/**
 * @module setupTests
 *
 * Shared Vitest setup: extends `expect` with jest-dom matchers and provides
 * a minimal `CSSStyleSheet.prototype.replaceSync` polyfill for jsdom, which
 * does not implement constructable stylesheets.
 */

import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// RTL's auto-cleanup detection doesn't always trigger under Vitest's
// explicit-import mode (no `globals: true`), so unmount explicitly.
afterEach(() => {
  cleanup();
});

if (typeof CSSStyleSheet.prototype.replaceSync !== "function") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (CSSStyleSheet.prototype as any).replaceSync = function replaceSync() {
    /* no-op in jsdom, layout/styling is not under test here */
  };
}

if (!("adoptedStyleSheets" in document)) {
  Object.defineProperty(document, "adoptedStyleSheets", {
    value: [],
    writable: true,
    configurable: true,
  });
}
