

/** @module resources/static - the hand-written text resources, served without touching the catalog */

import { readSkill } from "../tools/router/index.js";

/**
 * Serve rule://ai and rule://a11y.
 *
 * @param {string} uri
 * @returns {Array<{ uri: string, mimeType: string, text: string }>|null} the contents, or null when another branch owns the URI
 */
export function serveStaticText(uri) {
  // ── rule skill ───────────────────────────────────────────
  if (uri === "rule://ai") {
    return [{ uri, mimeType: "text/markdown", text: readSkill("rule") || "" }];
  }

  // ── A11y resources ─────────────────────────────────────────────
  if (uri === "rule://a11y") {
    return [
      {
        uri,
        mimeType: "text/markdown",
        text:
          "For the full a11y testing guide with Playwright + axe-core, see rule-styleguide a11y.md Section 12: Automated Testing.\n\n" +
          "Use `rule_tool_component component=a11y-test-basic` to generate test files.\n" +
          "Use `rule_tool_component component=playwright-config` to generate Playwright config.",
      },
    ];
  }

  return null;
}
