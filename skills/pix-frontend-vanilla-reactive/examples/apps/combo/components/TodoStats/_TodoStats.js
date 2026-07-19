// ═══════════════════════════════════════════════════════════════════════════════
//  Functional Component: TodoStats — combo app
//  ═══════════════════════════════════════════════════════════════════════════════
//  Pure html`` with its own _context for computed stats.
//  ═══════════════════════════════════════════════════════════════════════════════

import { html } from '../../../src/core/index.js';

/**
 * Renders a compact summary line from a todos array.
 * Sets its own _context so {{ total }} and {{ done }} resolve correctly.
 * @param {Array<{done: boolean}>} todos
 * @returns {TemplateResult}
 */
export function TodoStats(todos) {
  const total = todos.length;
  const done = todos.filter(t => t.done).length;
  const result = html`<aside data-part="stats"><strong>{{ total }}</strong> · <strong>{{ done }}</strong> done</aside>`;
  result._context = { total, done };
  return result;
}
