// ═══════════════════════════════════════════════════════════════════════════════
//  Functional Component: TodoStats — combo app
//  ═══════════════════════════════════════════════════════════════════════════════
//  Just html`` with ${} for computed values — no _context needed.
//  ═══════════════════════════════════════════════════════════════════════════════

import { html } from '../../../src/core/index.js';

/**
 * Renders a compact summary line from a todos array.
 * Composable via {{ TodoStats(visibleTodos) }} in any template.
 * @param {Array<{done: boolean}>} todos
 * @returns {TemplateResult}
 */
export function TodoStats(todos) {
  const total = todos.length;
  const done = todos.filter(t => t.done).length;
  return html`<aside data-part="stats"><strong>${total}</strong> · <strong>${done}</strong> done</aside>`;
}
