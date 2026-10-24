// Template Engine - Markdown filters

import { renderMarkdown } from "./_helpers.js";

/**
 * @param {import("../renderer/index.js").TemplateRenderer} renderer
 */
export function registerMarkdownFilters(renderer) {
  // Markdown filter: returns HTML but template engine inserts result
  // as text (escaping it) in normal interpolations. Existing tests
  // verify presence of code (might be escaped). To maintain
  // compatibility, if output contains <pre is="rule-mcp-highlighter"> we leave it as-is;
  // otherwise fallback to raw string.
  renderer.registerFilter("md", (value) => renderMarkdown(value));
  // Non-escaped variant to use with | raw filter if needed
  renderer.registerFilter("rawMd", (value) => renderMarkdown(value));
  renderer.registerFilter("markdown", (value) => renderMarkdown(value));
}
