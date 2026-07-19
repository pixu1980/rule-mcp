// ═══════════════════════════════════════════════════════════════════════════════
//  Shared store — vr-component-html example
//  ═══════════════════════════════════════════════════════════════════════════════

import { Store } from '../../../core/index.js';

/** Shared store with user profile and todo list. */
export const store = new Store({
  user: { name: 'Alice', role: 'admin' },
  todos: [
    { id: 1, title: 'Learn Pix', done: true },
    { id: 2, title: 'Build app', done: false },
  ],
});

/**
 * Toggle a todo's done state by id.
 * @param {number|string} id - Todo identifier
 */
export const toggleTodo = (id) => {
  store.state.todos = store.state.todos.map(t =>
    t.id === id ? { ...t, done: !t.done } : t
  );
};
