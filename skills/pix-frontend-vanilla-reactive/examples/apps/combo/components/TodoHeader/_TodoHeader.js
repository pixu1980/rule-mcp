// ═══════════════════════════════════════════════════════════════════════════════
//  TodoHeader — CustomElement vrComponent with External HTML
//  ═══════════════════════════════════════════════════════════════════════════════
//  Sub-component of combo demo. Uses loadTemplate() for its template.
//  Dispatches set-filter CustomEvent for parent to handle.
//  ═══════════════════════════════════════════════════════════════════════════════

import { vrComponent, html, loadTemplate, withContext } from '../../../src/core/index.js';

const TEMPLATE = await loadTemplate(import.meta.url, './_TodoHeader.template.html');

/**
 * Filter bar for the todo list. Dispatches 'set-filter' event.
 * Usage: <todo-header></todo-header>
 */
export class TodoHeader extends HTMLElement {
  static { vrComponent(this, { tag: 'todo-header' }); }

  /** @click handler — dispatches set-filter CustomEvent */
  setFilter(val) {
    this.dispatchEvent(new CustomEvent('set-filter', {
      bubbles: true, detail: { filter: val },
    }));
  }

  /** @returns {object} */
  context() { return {}; }

  /** @param {object} ctx */
  render(ctx) {
    return withContext(TEMPLATE, ctx);
  }
}
