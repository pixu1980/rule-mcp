// ═══════════════════════════════════════════════════════════════════════════════
//  Shared store + actions — combo app
//  ═══════════════════════════════════════════════════════════════════════════════

"use strict";

import { Store } from "../../core/index.js";

/** Shared todo store with filter. */
export const store = new Store({
  todos: [
    { id: 1, title: 'Learn CustomElement', done: true },
    { id: 2, title: 'Learn Functional', done: false },
    { id: 3, title: 'Learn External HTML', done: false },
  ],
  filter: 'all',
});

/**
 * Add a new todo.
 * @param {string} title - Todo text
 */
export const addTodo = (title) => {
  if (!title?.trim()) {
    return;
  }

  store.state.todos = [...store.state.todos, { id: Date.now(), title: title.trim(), done: false }];
};

/**
 * Toggle todo done state by id.
 * @param {number|string} id - Todo identifier
 */
export const toggleTodo = (id) => {
  store.state.todos = store.state.todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
};

/**
 * Set active filter.
 * @param {'all'|'open'|'done'} f - Filter value
 */
export const setFilter = (f) => {
  store.state.filter = f;
};

