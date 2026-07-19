// ═══════════════════════════════════════════════════════════════════════════════
//  TodoHeader — CustomElement vrComponent with External HTML
//  ═══════════════════════════════════════════════════════════════════════════════
//  Uses loadTemplate + store shared from parent scope.
//  ═══════════════════════════════════════════════════════════════════════════════

import { vrComponent, html, loadTemplate } from '../../../src/core/index.js';

const TEMPLATE = await loadTemplate(import.meta.url, './_TodoHeader.template.html');

export class TodoHeader extends HTMLElement {
  static { vrComponent(this, { tag: 'todo-header' }); }

  setFilter(val) {
    // Dispatches to parent app via CustomEvent
    this.dispatchEvent(new CustomEvent('set-filter', { bubbles: true, detail: { filter: val } }));
  }

  context() { return {}; }

  render(ctx) {
    const result = TEMPLATE;
    result._context = ctx;
    result._scope = this;
    return result;
  }
}
