// ═══════════════════════════════════════════════════════════════════════════════
//  App — Combo: all patterns mixed
//  ═══════════════════════════════════════════════════════════════════════════════
//
//  <todo-app> (CustomElement vrComponent)
//    └── {{ TodoStats(ctx) }} (Functional Component from _stats.js)
//    └── <todo-header> (CustomElement vrComponent with External HTML)
//    └── <for> loop (native)
//  ═══════════════════════════════════════════════════════════════════════════════

import { vrComponent, html } from '../../src/core/index.js';
import { store, addTodo, toggleTodo } from './_store.js';
import { TodoStats } from './_stats.js';
import './components/TodoHeader/index.js';

export class TodoApp extends HTMLElement {
  static { vrComponent(this, { tag: 'todo-app', css: import.meta.url }); }

  addFromForm($event) {
    $event.preventDefault();
    const input = $event.target.querySelector('input');
    addTodo(input?.value);
    input.value = '';
  }

  toggle(todo) { toggleTodo(todo.id); }

  get visibleTodos() {
    const f = store.state.filter;
    return f === 'all' ? store.state.todos
         : f === 'done' ? store.state.todos.filter(t => t.done)
         : store.state.todos.filter(t => !t.done);
  }

  context() { return { visibleTodos: this.visibleTodos, TodoStats }; }

  render(ctx) {
    return html`
      <todo-header></todo-header>
      {{ TodoStats(visibleTodos) }}
      <form @submit="addFromForm($event)">
        <input placeholder="Add…" /><button>Add</button>
      </form>
      <section>
        <for each="todo in visibleTodos">
          <article data-state-done="{{ todo.done }}">
            <span>{{ todo.title | upper }}</span>
            <button @click="toggle(todo)">Toggle</button>
          </article>
        </for>
      </section>
    `;
  }
}
