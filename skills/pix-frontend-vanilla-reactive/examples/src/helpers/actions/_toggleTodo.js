// ═══════════════════════════════════════════════════════════════════════════════
//  Action: toggleTodo
// ═══════════════════════════════════════════════════════════════════════════════

import { appStore } from '../shared/index.js';

export function toggleTodo(id) {
  const idx = appStore.state.todos.findIndex(t => t.id === id);
  if (idx < 0) return;
  appStore.state.todos[idx] = { ...appStore.state.todos[idx], completed: !appStore.state.todos[idx].completed };
}
