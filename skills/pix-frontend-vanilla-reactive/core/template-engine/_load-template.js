// ═══════════════════════════════════════════════════════════════════════════════
//  Helper: load external .template.html file
//  ═══════════════════════════════════════════════════════════════════════════════
//  Usage: const TPL = await loadTemplate(import.meta.url, './_Card.template.html');
//  Then use TPL directly as a TemplateResult in render():
//    render(ctx) { const r = TPL; r._context = ctx; r._scope = this; return r; }
//  ═══════════════════════════════════════════════════════════════════════════════

"use strict";

import { html } from "./index.js";

/**
 * Fetch an external .template.html file and parse it into a TemplateResult.
 *
 * @param {string} metaUrl - Pass `import.meta.url` from the calling module
 * @param {string} relativePath - Relative path to the .template.html file
 * @returns {Promise<{kind: 'template-result', strings: string[], values: []}>}
 */
export async function loadTemplate(metaUrl, relativePath) {
  const url = new URL(relativePath, metaUrl);

  const text = await (await fetch(url)).text();
  return html(text);
}

