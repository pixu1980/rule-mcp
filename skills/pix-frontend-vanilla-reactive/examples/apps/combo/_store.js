// ═══════════════════════════════════════════════════════════════════════════════
//  Shared store + actions — combo app
//  ═══════════════════════════════════════════════════════════════════════════════

import { Store } from '../../src/core/index.js';

export const store = new Store({
  todos: [
    { id: 1, title: 'Learn CustomElement', done: true },
    { id: 2, title: 'Learn Functional', done: false },
    { id: 3, title: 'Learn External HTML', done: false },
  ],
  filter: 'all',
});

export const addTodo = (title) => {
  if (!title?.trim()) return;
  store.state.todos = [...store.state.todos, { id: Date.now(), title: title.trim(), done: false }];
};

export const toggleTodo = (id) => {
  store.state.todos = store.state.todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
};

export const setFilter = (f) => { store.state.filter = f; };
