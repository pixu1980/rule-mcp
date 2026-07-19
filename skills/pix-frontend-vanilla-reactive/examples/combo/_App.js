// ═══════════════════════════════════════════════════════════════════════════════
//  App — Combo: all patterns mixed
//  ═══════════════════════════════════════════════════════════════════════════════
//  Just html`` — vrComponent handles _context and _scope automatically.
//  ═══════════════════════════════════════════════════════════════════════════════

'use strict';
import { vrComponent, html } from '../../core/index.js';
import { store, addTodo, toggleTodo } from './_store.js';
import { TodoStats } from './components/TodoStats/index.js';
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
