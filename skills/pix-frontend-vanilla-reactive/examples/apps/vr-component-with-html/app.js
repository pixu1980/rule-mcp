// ═══════════════════════════════════════════════════════════════════════════════
//  pattern CustomElement vrComponent with External HTMLustomElement vrComponent with External HTML — CE + external .template.html (user card)
//  ═══════════════════════════════════════════════════════════════════════════════
//  Template HTML is loaded from a separate file, parsed via html().
//  The .template.html uses only {{ }}, <for>, <if>, @click.
//  No ${} closures — events via @click="methodName(args)".
//  ═══════════════════════════════════════════════════════════════════════════════

import { Store, Signal, vrComponent, html } from '../../src/core/index.js';

// ── Store + TickState ──────────────────────────────────────────
const store = new Store({
  user: { name: 'Alice', role: 'admin' },
  todos: [
    { id: 1, title: 'Learn Pix', done: true },
    { id: 2, title: 'Build app', done: false },
    { id: 3, title: 'Ship it', done: false },
  ],
});
const tickState = new Signal.State(0, { equals: () => false });
window.addEventListener('store:change', () => tickState.set(performance.now()));

// ── Load external template ──────────────────────────────────────
const templateStr = await (
  await fetch(new URL('./_Card.template.html', import.meta.url))
).text();
const TEMPLATE = html(templateStr);

// ── Component ───────────────────────────────────────────────────
class UserCard extends HTMLElement {
  static { vrComponent(this, { tag: 'user-card', css: import.meta.url }); }

  toggleTodo(id) {
    store.state.todos = store.state.todos.map(t =>
      t.id === id ? { ...t, done: !t.done } : t
    );
  }

  context() {
    return { user: store.state.user, todos: store.state.todos };
  }

  render(ctx) {
    const result = TEMPLATE;
    result._context = ctx;
    result._scope = this;   // methods = @click handlers
    return result;
  }
}

// ── Kick ────────────────────────────────────────────────────────
tickState.set(performance.now());
