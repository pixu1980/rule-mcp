// ═══════════════════════════════════════════════════════════════════════════════
//  Functional Component: TodoStats — combo app
//  ═══════════════════════════════════════════════════════════════════════════════
//  Composable via {{ TodoStats(ctx) }} in any template.
//  ═══════════════════════════════════════════════════════════════════════════════

import { html, compose } from '../../src/core/index.js';

/**
 * Renders a compact summary line from a todos array.
 * @param {Array<{done: boolean}>} todos
 * @returns {TemplateResult}
 */
export function TodoStats(todos) {
  const total = todos.length;
  const done = todos.filter(t => t.done).length;
  return compose(
    html`<aside data-part="stats"><strong>{{ total }}</strong> · <strong>{{ done }}</strong> done</aside>`,
    { total, done },
  );
}
