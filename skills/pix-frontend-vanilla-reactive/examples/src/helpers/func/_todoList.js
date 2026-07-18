// ═══════════════════════════════════════════════════════════════════════════════
//  Pattern B — Functional Component: TodoList
//  ═══════════════════════════════════════════════════════════════════════════════
//  Plain function returning html``. _scope for @click resolution.
//  Composable via {{ TodoList(todos) }} in a parent template.
//  ═══════════════════════════════════════════════════════════════════════════════

import { html } from '../../core/index.js';

const handleDelete = (id) => {
  // In a real app: store.state.todos = store.state.todos.filter(t => t.id !== id)
  console.log('delete', id);
};

/**
 * TodoList — renders a list with delete buttons.
 * @param {object} ctx - { todos: Array<{id:string, title:string}> }
 * @returns {TemplateResult}
 */
export function TodoList(ctx) {
  const result = html`
    <section data-part="todo-list" aria-label="Todo list">
      <for each="todo in ctx.todos">
        <article data-part="card">
          <span>{{ todo.title | upper }}</span>
          <button @click="handleDelete(todo.id)">✕</button>
        </article>
      </for>
      <if condition="ctx.todos.length === 0">
        <p data-part="empty">No items.</p>
      </if>
    </section>
  `;
  result._scope = { handleDelete };
  result._context = ctx;
  return result;
}
