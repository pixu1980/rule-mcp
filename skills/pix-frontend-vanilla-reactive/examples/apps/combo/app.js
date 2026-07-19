// ═══════════════════════════════════════════════════════════════════════════════
//  Combo — All 3 Patterns in one app
//  ═══════════════════════════════════════════════════════════════════════════════
//
//  Pattern CustomElement vrComponent (root): <todo-app> — vrComponent, methods, context(), render()
//  Pattern Functional Component (inside): {{ TodoStats(ctx) }} — functional component in {{ }}
//  Pattern CustomElement vrComponent with External HTML (inside): <todo-header> — CE with external .template.html
//
//  Composition chain:
//    <todo-app> (Pattern CustomElement vrComponent)
//      └── {{ TodoStats(ctx) }} (Pattern Functional Component, via {{ }})
//      └── <todo-header> (Pattern CustomElement vrComponent with External HTML, native CE tag)
//      └── <todo-item> (Pattern CustomElement vrComponent, via <for> body)
//  ═══════════════════════════════════════════════════════════════════════════════

import { Store, Signal, effect, html, render, registerFilter,
        vrComponent } from '../../src/core/index.js';

// ── Store + TickState ──────────────────────────────────────────
const store = new Store({
  todos: [
    { id: 1, title: 'Learn Pattern CustomElement vrComponent', done: true },
    { id: 2, title: 'Learn Pattern Functional Component', done: false },
    { id: 3, title: 'Learn Pattern CustomElement vrComponent with External HTML', done: false },
  ],
  filter: 'all',
});
const tickState = new Signal.State(0, { equals: () => false });
window.addEventListener('store:change', () => tickState.set(performance.now()));

registerFilter('upper', v => String(v).toUpperCase());

// ── Actions ─────────────────────────────────────────────────────
const addTodo = (title) => {
  if (!title?.trim()) return;
  store.state.todos = [...store.state.todos,
    { id: Date.now(), title: title.trim(), done: false }];
};
const toggleTodo = (id) => {
  store.state.todos = store.state.todos.map(t =>
    t.id === id ? { ...t, done: !t.done } : t);
};
const setFilter = (f) => { store.state.filter = f; };

// ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
//  Pattern Functional Component — Functional Component: TodoStats
//  ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──

function TodoStats(ctx) {
  const total = ctx.todos.length;
  const done = ctx.todos.filter(t => t.done).length;
  const result = html`
    <aside data-part="stats">
      <strong>{{ total }}</strong> total ·
      <strong>{{ done }}</strong> done ·
      <strong>{{ total - done }}</strong> open
    </aside>
  `;
  result._scope = {};
  result._context = { total, done };
  return result;
}

// ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
//  Pattern CustomElement vrComponent with External HTML — Custom Element with external template: <todo-header>
//  ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──

const headerTpl = await (
  await fetch(new URL('./components/TodoHeader/_Header.template.html', import.meta.url))
).text();
const HEADER_TMPL = html(headerTpl);

class TodoHeader extends HTMLElement {
  static { vrComponent(this, { tag: 'todo-header', css: import.meta.url }); }

  setFilter(val) { setFilter(val === 'all' ? 'all' : val); }

  context() { return { filter: store.state.filter }; }

  render(ctx) {
    const result = HEADER_TMPL;
    result._context = ctx;
    result._scope = this;
    return result;
  }
}

// ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
//  Pattern CustomElement vrComponent — Main App: <todo-app>
//  ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──

class TodoApp extends HTMLElement {
  static { vrComponent(this, { tag: 'todo-app', css: import.meta.url }); }

  addFromForm($event) {
    $event.preventDefault();
    const input = $event.target.querySelector('[data-part="input"]');
    addTodo(input.value);
    input.value = '';
  }

  toggle(todo) { toggleTodo(todo.id); }

  get visibleTodos() {
    const f = store.state.filter;
    return f === 'all' ? store.state.todos
         : f === 'done' ? store.state.todos.filter(t => t.done)
         : store.state.todos.filter(t => !t.done);
  }

  context() {
    return {
      todos: store.state.todos,
      visibleTodos: this.visibleTodos,
      filter: store.state.filter,
    };
  }

  render(ctx) {
    return html`
      <todo-header></todo-header>
      {{ TodoStats(ctx) }}

      <form @submit="addFromForm($event)" data-part="form">
        <input data-part="input" placeholder="Add todo…" />
        <button>Add</button>
      </form>

      <section data-part="list">
        <for each="todo in visibleTodos">
          <article data-part="item" data-state-done="{{ todo.done }}">
            <span>{{ todo.title | upper }}</span>
            <button @click="toggle(todo)">Toggle</button>
          </article>
        </for>
      </section>
    `;
  }
}

// ── Boot ────────────────────────────────────────────────────────
tickState.set(performance.now());
