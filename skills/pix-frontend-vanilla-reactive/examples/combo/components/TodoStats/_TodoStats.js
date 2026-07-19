// ═══════════════════════════════════════════════════════════════════════════════
//  Functional Component: TodoStats — combo app
//  ═══════════════════════════════════════════════════════════════════════════════
//  Zero boilerplate: just html`` with {{ }} + filters.
//  Values come from the rendering context (set by parent).
//  ═══════════════════════════════════════════════════════════════════════════════

'use strict';

import { html } from '../../../../core/index.js';

/**
 * Renders a compact summary line from a todos array.
 * Uses | length and | where filters — no _context needed.
 * The variable name must match what's available in the parent's _context.
 * @param {Array<{done: boolean}>} visibleTodos
 * @returns {TemplateResult}
 */
export function TodoStats(visibleTodos) {
  return html`<aside data-part="stats">
    <strong>{{ visibleTodos | length }}</strong> ·
    <strong>{{ visibleTodos | where:"done" | length }}</strong> done
  </aside>`;
}

