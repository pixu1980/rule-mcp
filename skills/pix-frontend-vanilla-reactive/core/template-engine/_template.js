// ═══════════════════════════════════════════════════════════════════════════════
//  render() function
// ═══════════════════════════════════════════════════════════════════════════════
//  Renders a TemplateResult into a DOM container.
//  Accepts optional context (for {{ }}) and scope (for @click="handler").
//
//  Pattern A/C: vrComponent calls render() — no extra args needed.
//  Pattern B:   render(html\`\`, root, { items }, { addItem });
//  ═══════════════════════════════════════════════════════════════════════════════

"use strict";

import { ChildNodePart } from "../dom-parts/_child-node-part.js";

/**
 * Render a TemplateResult into a DOM container.
 *
 * @param {{ kind: string, strings: Array, values: Array, _context?: object, _scope?: object }} result
 * @param {HTMLElement} container - Target DOM element
 * @param {object} [context] - Data context for {{ }} expressions (sets result._context)
 * @param {object} [scope] - Function scope for @click handlers (sets result._scope)
 */
export function render(result, container, context, scope) {
  // Only set context/scope if not already set by the component
  // (Pattern B functions may set their own _context before returning)
  if (context && !result._context) {
    result._context = context;
  }

  if (scope && !result._scope) {
    result._scope = scope;
  }

  let rootPart = container.__rootPart;
  if (!rootPart) {
    const s = document.createComment("root:start");

    const e = document.createComment("root:end");
    container.textContent = "";
    container.append(s, e);
    rootPart = new ChildNodePart(s, e);
    container.__rootPart = rootPart;
  }

  rootPart.setValue(result);
}
