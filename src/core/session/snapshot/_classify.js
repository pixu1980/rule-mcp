

/** @module core/session/snapshot/classify - what counts as source, test, barrel, ignored */

/** Directories that are never source, however large they are. */
export const IGNORED = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  ".nuxt",
  ".output",
  ".turbo",
  ".cache",
  ".tokensave",
  ".venv",
  "venv",
  "__pycache__",
]);

/** Extensions counted as source text. Anything else is weighed but not read. */
export const SOURCE_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".jsx",
  ".ts",
  ".tsx",
  ".vue",
  ".svelte",
  ".astro",
  ".css",
  ".scss",
  ".html",
  ".json",
  ".md",
  ".yaml",
  ".yml",
  ".sh",
  ".py",
  ".rs",
  ".go",
]);

/** Files whose names say they are tests. */
export const TEST_PATTERN = /(\.test\.|\.spec\.|__tests__)/;

/** A barrel is what turns a directory into a component in this styleguide. */
export const BARRELS = new Set(["index.js", "index.jsx", "index.ts", "index.tsx", "index.mjs"]);
