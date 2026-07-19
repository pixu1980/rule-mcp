// ═══════════════════════════════════════════════════════════════════════════════
//  UserCard — CustomElement vrComponent with External HTML
//  ═══════════════════════════════════════════════════════════════════════════════
//  Usage: <user-card></user-card>
//  Uses template option + context() — no render() method needed.
//  ═══════════════════════════════════════════════════════════════════════════════

import { vrComponent, html, loadTemplate } from '../../../../../core/index.js';
import { store, toggleTodo } from '../../_store.js';

const TEMPLATE = await loadTemplate(import.meta.url, './_UserCard.template.html');

export class UserCard extends HTMLElement {
  static {
    vrComponent(this, {
      tag: 'user-card',
      css: import.meta.url,
      template: TEMPLATE,
    });
  }

  toggleTodo(id) { toggleTodo(id); }

  context() { return { user: store.state.user, todos: store.state.todos }; }
}
