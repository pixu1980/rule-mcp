// ═══════════════════════════════════════════════════════════════════════════════
//  App — CustomElement vrComponent with External HTML (user card)
//  ═══════════════════════════════════════════════════════════════════════════════

import { vrComponent, html, loadTemplate, withContext } from '../../src/core/index.js';
import { store, toggleTodo } from './_store.js';

const TEMPLATE = await loadTemplate(import.meta.url, './_Card.template.html');

export class UserCard extends HTMLElement {
  static { vrComponent(this, { tag: 'user-card', css: import.meta.url }); }

  // Delegate to imported action
  toggleTodo(id) { toggleTodo(id); }

  context() { return { user: store.state.user, todos: store.state.todos }; }

  render(ctx) {
    return withContext(TEMPLATE, ctx);  // _scope = this (auto by vrComponent)
  }
}
