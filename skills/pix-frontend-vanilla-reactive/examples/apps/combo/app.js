// ═══════════════════════════════════════════════════════════════════════════════
//  Combo — All patterns in one app
//  ═══════════════════════════════════════════════════════════════════════════════
//  Uses store.tick (automatic) instead of manual tickState.

import { Store, effect, html, render, registerFilter,
        vrComponent } from '../../src/core/index.js';

const store = new Store({
  todos: [
    { id: 1, title: 'Learn CustomElement', done: true },
    { id: 2, title: 'Learn Functional', done: false },
    { id: 3, title: 'Learn External HTML', done: false },
  ],
  filter: 'all',
});
registerFilter('upper', v => String(v).toUpperCase());

const addTodo = (title) => {
  if (!title?.trim()) return;
  store.state.todos = [...store.state.todos, { id: Date.now(), title: title.trim(), done: false }];
};
const toggleTodo = (id) => {
  store.state.todos = store.state.todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
};
const setFilter = (f) => { store.state.filter = f; };

// ── Functional Component ───────────────────────────────────────
function TodoStats(ctx) {
  const total = ctx.todos.length;
  const done = ctx.todos.filter(t => t.done).length;
  const result = html`
    <aside><strong>{{ total }}</strong> total · <strong>{{ done }}</strong> done</aside>`;
  result._scope = {};
  result._context = { total, done };
  return result;
}

// ── External HTML template (CustomElement vrComponent with External HTML) ──
const headerTpl = await (
  await fetch(new URL('./components/TodoHeader/_Header.template.html', import.meta.url))
).text();
const HEADER_TMPL = html(headerTpl);

class TodoHeader extends HTMLElement {
  static { vrComponent(this, { tag: 'todo-header', css: import.meta.url }); }
  setFilter(val) { setFilter(val); }
  context() { return { filter: store.state.filter }; }
  render(ctx) {
    const result = HEADER_TMPL;
    result._context = ctx;
    result._scope = this;
    return result;
  }
}

// ── Main App (CustomElement vrComponent) ────────────────────────
class TodoApp extends HTMLElement {
  static { vrComponent(this, { tag: 'todo-app', css: import.meta.url }); }
  addFromForm($event) {
    $event.preventDefault();
    addResult($event.target.querySelector('input')?.value);
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

store.tick.set(performance.now());
