// ═══════════════════════════════════════════════════════════════════════════════
//  App — Combo: all patterns mixed
//  ═══════════════════════════════════════════════════════════════════════════════
//
//  <todo-app> (CustomElement vrComponent)
//    └── {{ TodoStats(visibleTodos) }} (Functional Component from _stats.js)
//    └── <todo-header> (CustomElement vrComponent with External HTML)
//    └── <for> loop (native template)
//  ═══════════════════════════════════════════════════════════════════════════════

import { vrComponent, html } from '../../src/core/index.js';
import { store, addTodo, toggleTodo } from './_store.js';
import { TodoStats } from './components/TodoStats/index.js';
import './components/TodoHeader/index.js';

/**
 * Todo app — combines all three component patterns.
 * Usage: <todo-app></todo-app>
 */
export class TodoApp extends HTMLElement {
  static { vrComponent(this, { tag: 'todo-app', css: import.meta.url }); }

  /** @click handler — reads form input and calls addTodo */
  addFromForm($event) {
    $event.preventDefault();
    const input = $event.target.querySelector('input');
    addTodo(input?.value);
    input.value = '';
  }

  /** @click handler */
  toggle(todo) { toggleTodo(todo.id); }

  /** Get todos filtered by current state.filter. */
  get visibleTodos() {
    const f = store.state.filter;
    return f === 'all' ? store.state.todos
         : f === 'done' ? store.state.todos.filter(t => t.done)
         : store.state.todos.filter(t => !t.done);
  }

  /** @returns {{ visibleTodos: Array, TodoStats: Function }} */
  context() { return { visibleTodos: this.visibleTodos, TodoStats }; }

  /** @param {{ visibleTodos: Array }} ctx */
  render(ctx) {
    return html`
      <todo-header></todo-header>
      {{ TodoStats(visibleTodos) }}
      <form data-part="form" @submit="addFromForm($event)">
        <input data-part="input" placeholder="Add…" /><button data-part="submit">Add</button>
      </form>
      <section data-part="list">
        <for each="todo in visibleTodos">
          <article data-part="item" data-state-done="{{ todo.done }}">
            <span data-part="title">{{ todo.title | upper }}</span>
            <button data-part="toggle" @click="toggle(todo)">Toggle</button>
          </article>
        </for>
      </section>
    `;
  }
}
