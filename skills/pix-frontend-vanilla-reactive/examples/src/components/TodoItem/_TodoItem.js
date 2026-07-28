// ═══════════════════════════════════════════════════════════════════════════════
//  Component: TodoItem
//  ── Custom element class with static init + external CSS via adoptedStyleSheets
//  ═══════════════════════════════════════════════════════════════════════════════

import { html, model } from '../../core/index.js';
import { appStore, tickState } from '../../helpers/shared/index.js';
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
    const completedModel = model({
      signal: tickState,
      get: () => {
        const t = appStore.state.todos.find((x) => x.id === todo.id);
        return t ? t.completed : false;
      },
      set: () => toggleTodo(todo.id),
      prop: 'checked',
      event: 'change',
    });
    const titleModel = model({
      signal: tickState,
      get: () => {
        const t = appStore.state.todos.find((x) => x.id === todo.id);
        return t ? t.title : '';
      },
      set: (v) => updateTodoTitle(todo.id, v),
    });

    const result = html`
      <article data-part="todo-item" data-state-completed="${todo.completed ? 'done' : ''}">
        <input type="checkbox" model=${completedModel} />
        <input model=${titleModel} data-part="todo-title" />
        <span data-part="tag">{{ todo.title | upper | truncate:10 }}</span>
        <button type="button" data-part="delete-btn" @click=${() => deleteTodo(todo.id)}>✕</button>
        <if condition="todo.completed">
          <span data-part="badge">✓ DONE</span>
        </if>
      </article>
    `;
    result._context = { todo };
    return result;
  }

  connectedCallback() {
    const todoId = this.dataset.todoId;
    const todo = appStore.state.todos.find((t) => t.id === todoId);
    if (!todo) return;
    const result = TodoItem.render(todo);
    result._context = { todo };
    import('../../core/template-engine/_template.js').then(({ render }) => {
      render(result, this);
    });
  }
}
