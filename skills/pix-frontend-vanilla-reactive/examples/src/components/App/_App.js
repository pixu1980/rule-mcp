// ═══════════════════════════════════════════════════════════════════════════════
//  Component: App (composition root)
//  ── Custom element class with external CSS via adoptedStyleSheets
//  ═══════════════════════════════════════════════════════════════════════════════

import { html, effect, render } from '../../core/index.js';
import { addTodo, setFilter, deleteTodo, toggleTodo } from '../../helpers/actions/index.js';
import { renderContext } from '../../helpers/computed/index.js';
import { tickState } from '../../helpers/shared/index.js';

const cssText = await (
  await fetch(new URL('./_App.css', import.meta.url))
).text();
const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

export class App extends HTMLElement {
  static {
    customElements.define('app-root', this);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  }

  static render(context) {
    const _scope = { addTodo, setFilter, deleteTodo, toggleTodo };

    const result = html`
      <h1>{{ appTitle }}</h1>

      <aside data-part="demo-note">
        <strong>✦ Template engine syntax in action</strong><br>
        Description: {{ description | raw }}<br>
        Pulse count: <code>{{ pulseCount }}</code> ·
        <code>total</code>: <strong>{{ total }}</strong> todos ·
        <code>tags | join:", "</code>: {{ tags | join:', ' | default:'no tags' }}
        <br>
        <code>appTitle | slugify | upper</code>: "{{ appTitle | slugify | upper }}" ·
        <code>extraInfo | default:"—"</code>: {{ extraInfo | default:'—' }}
      </aside>

      <section data-part="add-form">
        <form @submit="addTodoFromForm($event)">
          <input name="title" placeholder="What needs to be done?" />
          <button type="submit">Add</button>
        </form>
      </section>

      <nav aria-label="Filter todos">
        <span>Filter:</span>
        <button type="button" @click="setFilter('all')">All</button>
        <button type="button" @click="setFilter('open')">Open</button>
        <button type="button" @click="setFilter('done')">Done</button>
        <span data-part="filter-label">
          Current: <strong>{{ filterStatus }}</strong>
        </span>
      </nav>

      <ul data-part="stats">
        <li>Total: <strong>{{ total }}</strong></li>
        <li>Open: <strong>{{ open }}</strong></li>
        <li>Done: <strong>{{ completed }}</strong></li>
      </ul>

      <hr>

      <h3>Todo list</h3>
      <section aria-label="Todo list">
        <for each="todo in visibleTodos">
          <article data-part="todo-card" data-state-done="{{ todo.completed }}">
            <span>{{ todo.title | upper }}</span>
            <button type="button" @click="deleteTodo(todo.id)">✕</button>
          </article>
        </for>
      </section>

      <p data-part="tick-footer">
        tickState pulse count: {{ pulseCount }}
      </p>

      <hr>

      <p data-part="meta-bar">
        <code>{{ appTitle | slugify | upper }}</code> ·
        raw HTML test: {{ description | raw }}
      </p>
    `;

    result._context = context;
    result._scope = {
      addTodo: (e) => {
        e.preventDefault();
        const inp = e.target.querySelector('input[name="title"]');
        addTodo(inp.value);
        inp.value = '';
      },
      setFilter,
      deleteTodo,
      toggleTodo,
    };
    return result;
  }

  connectedCallback() {
    if (this._isMounted) return;
    this._isMounted = true;

    effect(() => {
      const ctx = renderContext.get();
      const result = App.render(ctx);
      result._context = ctx;
      render(result, this);
    });
    tickState.set(performance.now());
  }
}
