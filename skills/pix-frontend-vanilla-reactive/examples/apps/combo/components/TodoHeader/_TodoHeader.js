// ═══════════════════════════════════════════════════════════════════════════════
//  TodoHeader — CustomElement vrComponent with External HTML
//  ═══════════════════════════════════════════════════════════════════════════════
//  Sub-component of combo demo. Uses template option in vrComponent
//  instead of writing a render() method. context() omitted — defaults to {}.
//  ═══════════════════════════════════════════════════════════════════════════════

import { vrComponent, html, loadTemplate } from '../../../../../core/index.js';

const TEMPLATE = await loadTemplate(import.meta.url, './_TodoHeader.template.html');

/**
 * Filter bar for the todo list. Dispatches 'set-filter' event.
 * Usage: <todo-header></todo-header>
 */
export class TodoHeader extends HTMLElement {
  static {
    vrComponent(this, {
      tag: 'todo-header',
      template: TEMPLATE,  // ← instead of render() method
    });
  }

  /** @click handler — dispatches set-filter CustomEvent */
  setFilter(val) {
    this.dispatchEvent(new CustomEvent('set-filter', {
      bubbles: true, detail: { filter: val },
    }));
  }
}
