// ═══════════════════════════════════════════════════════════════════════════════
//  Functional Component: TodoStats — combo app
//  ═══════════════════════════════════════════════════════════════════════════════
//  Pure html`` with result._context for computed local values.
//  This is the canonical way to inject computed data into a template
//  without ${} in the template string.
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
  const result = html`<aside data-part="stats"><strong>{{ total }}</strong> · <strong>{{ done }}</strong> done</aside>`;
  result._context = { total, done };
  return result;
}
