// ═══════════════════════════════════════════════════════════════════════════════
//  App — Combo: all patterns mixed
//  ═══════════════════════════════════════════════════════════════════════════════
//
//  <todo-app> (CustomElement vrComponent)
//    └── {{ TodoStats(ctx) }} (Functional Component via {{ }})
//    └── <todo-header> (CustomElement vrComponent with External HTML)
//    └── <for> loop (native in template)
//  ═══════════════════════════════════════════════════════════════════════════════

import { Store, registerFilter, vrComponent, html, compose } from '../src/core/index.js';
import './components/TodoHeader/index.js';

const store = new Store({
  todos: [
    { id: 1, title: 'Learn CustomElement', done: true },
    { id: 2, title: 'Learn Functional', done: false },
    { id: 3, title: 'Learn External HTML', done: false },
  ],
  filter: 'all',
});

registerFilter('upper', v => String(v).toUpperCase());

// ── Actions ────────────────────────────────────────────────────
const addTodo = (title) => {
  if (!title?.trim()) return;
  store.state.todos = [...store.state.todos, { id: Date.now(), title: title.trim(), done: false }];
};
const toggleTodo = (id) => {
  store.state.todos = store.state.todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
};
const setFilter = (f) => { store.state.filter = f; };

// ── Functional Component: TodoStats ─────────────────────────────
function TodoStats(ctx) {
  const total = ctx.todos.length;
  const done = ctx.todos.filter(t => t.done).length;
  return compose(html`<aside><strong>{{ total }}</strong> · <strong>{{ done }}</strong> done</aside>`, { total, done });
}

// ── Main App ────────────────────────────────────────────────────
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

  context() { return { visibleTodos: this.visibleTodos }; }

  render(ctx) {
    return html`
      <todo-header></todo-header>
      {{ TodoStats(ctx) }}
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
