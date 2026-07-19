// ═══════════════════════════════════════════════════════════════════════════════
//  Shared store — vr-component-html example
//  ═══════════════════════════════════════════════════════════════════════════════

import { Store } from '../../src/core/index.js';

export const store = new Store({
  user: { name: 'Alice', role: 'admin' },
  todos: [
    { id: 1, title: 'Learn Pix', done: true },
    { id: 2, title: 'Build app', done: false },
  ],
});

export const toggleTodo = (id) => {
  store.state.todos = store.state.todos.map(t =>
    t.id === id ? { ...t, done: !t.done } : t
  );
};
