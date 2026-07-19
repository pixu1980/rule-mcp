// ═══════════════════════════════════════════════════════════════════════════════
//  Component: TodoItem (v2)
//  ── Pattern CustomElement vrComponent: Custom Element with static render using html``
//  ═══════════════════════════════════════════════════════════════════════════════

import { html } from '../../core/index.js';
import { appStore } from '../../helpers/shared/index.js';
import { toggleTodo, updateTodoTitle, deleteTodo } from '../../helpers/actions/index.js';

const cssText = await (
  await fetch(new URL('./_TodoItem.css', import.meta.url))
).text();
const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

export class TodoItem extends HTMLElement {
  static {
    customElements.define('todo-item', this);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  }

  static render(todo) {
    const result = html`
      <article data-part="todo-item" data-state-completed="{{ todo.completed }}">
        <input type="checkbox" data-part="toggle" .checked="{{ todo.completed }}" />
        <span data-part="title">{{ todo.title | upper | truncate:10 }}</span>
        <button type="button" data-part="delete-btn" @click="deleteTodo(todo.id)">✕</button>
        <if condition="todo.completed">
          <span data-part="badge">✓ DONE</span>
        </if>
      </article>
    `;
    result._context = { todo };
    result._scope = { toggleTodo, updateTodoTitle, deleteTodo };
    return result;
  }

  connectedCallback() {
    const todoId = this.dataset.todoId;
    const todo = appStore.state.todos.find((t) => t.id === todoId);
    if (!todo) return;
    const result = TodoItem.render(todo);
    result._context = { todo };
    result._scope = { toggleTodo, updateTodoTitle, deleteTodo };
    import('../../core/template-engine/_template.js').then(({ render }) => {
      render(result, this);
    });
  }
}
