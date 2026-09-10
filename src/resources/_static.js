// SPDX-FileCopyrightText: 2025-2026 pixu1980
// SPDX-License-Identifier: MIT
/** @module resources/static - the hand-written text resources, served without touching the catalog */

import { readSkill } from "../tools/router/index.js";

/**
 * Serve pix://ai and pix://a11y.
 *
 * @param {string} uri
 * @returns {Array<{ uri: string, mimeType: string, text: string }>|null} the contents, or null when another branch owns the URI
 */
export function serveStaticText(uri) {
  // ── pix skill ───────────────────────────────────────────
  if (uri === "pix://ai") {
    return [{ uri, mimeType: "text/markdown", text: readSkill("pix") || "" }];
  }

  // ── A11y resources ─────────────────────────────────────────────
  if (uri === "pix://a11y") {
    return [
      {
        uri,
        mimeType: "text/markdown",
        text:
          "For the full a11y testing guide with Playwright + axe-core, see pix-styleguide a11y.md Section 12: Automated Testing.\n\n" +
          "Use `pix_tool_component component=a11y-test-basic` to generate test files.\n" +
          "Use `pix_tool_component component=playwright-config` to generate Playwright config.",
      },
    ];
  }

  return null;
}
