// ═══════════════════════════════════════════════════════════════════════════════
//  App — CustomElement vrComponent with External HTML (user card)
//  ═══════════════════════════════════════════════════════════════════════════════
//  Just return TEMPLATE — vrComponent handles _context and _scope.
//  ═══════════════════════════════════════════════════════════════════════════════

import { vrComponent, html, loadTemplate } from '../../src/core/index.js';
import { store, toggleTodo } from './_store.js';

const TEMPLATE = await loadTemplate(import.meta.url, './_Card.template.html');

export class UserCard extends HTMLElement {
  static { vrComponent(this, { tag: 'user-card', css: import.meta.url }); }

  toggleTodo(id) { toggleTodo(id); }

  context() { return { user: store.state.user, todos: store.state.todos }; }

  render(ctx) {
    return TEMPLATE;
  }
}
