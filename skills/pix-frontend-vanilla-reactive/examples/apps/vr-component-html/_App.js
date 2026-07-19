// ═══════════════════════════════════════════════════════════════════════════════
//  App — CustomElement vrComponent with External HTML (user card)
//  ═══════════════════════════════════════════════════════════════════════════════
//  Loads template from _Card.template.html via loadTemplate() helper.
//  @click methods delegate to imported store actions.
//  ═══════════════════════════════════════════════════════════════════════════════

import { vrComponent, html, loadTemplate, withContext } from '../../src/core/index.js';
import { store, toggleTodo } from './_store.js';

const TEMPLATE = await loadTemplate(import.meta.url, './_Card.template.html');

/**
 * User card — shows profile info and editable todo list.
 * Usage: <user-card></user-card>
 */
export class UserCard extends HTMLElement {
  static { vrComponent(this, { tag: 'user-card', css: import.meta.url }); }

  /** @click handler — delegates to imported toggleTodo */
  toggleTodo(id) { toggleTodo(id); }

  /** @returns {{ user: object, todos: Array }} */
  context() { return { user: store.state.user, todos: store.state.todos }; }

  /** @param {object} ctx */
  render(ctx) {
    return withContext(TEMPLATE, ctx);
  }
}
