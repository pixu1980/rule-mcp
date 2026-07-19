// ═══════════════════════════════════════════════════════════════════════════════
//  Pattern CustomElement vrComponent with External HTML — user card
//  ═══════════════════════════════════════════════════════════════════════════════
//  Uses store.tick (automatic) instead of manual tickState.

import { Store, vrComponent, html } from '../../src/core/index.js';

const store = new Store({
  user: { name: 'Alice', role: 'admin' },
  todos: [
    { id: 1, title: 'Learn Pix', done: true },
    { id: 2, title: 'Build app', done: false },
  ],
});

const templateStr = await (
  await fetch(new URL('./_Card.template.html', import.meta.url))
).text();
const TEMPLATE = html(templateStr);

class UserCard extends HTMLElement {
  static { vrComponent(this, { tag: 'user-card', css: import.meta.url }); }
  toggleTodo(id) {
    store.state.todos = store.state.todos.map(t =>
      t.id === id ? { ...t, done: !t.done } : t
    );
  }
  context() { return { user: store.state.user, todos: store.state.todos }; }
  render(ctx) {
    const result = TEMPLATE;
    result._context = ctx;
    result._scope = this;
    return result;
  }
}

store.tick.set(performance.now());
