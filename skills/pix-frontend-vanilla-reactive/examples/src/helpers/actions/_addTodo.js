// ═══════════════════════════════════════════════════════════════════════════════
//  Action: addTodo
// ═══════════════════════════════════════════════════════════════════════════════

import { appStore } from '../shared/index.js';

export function addTodo(title) {
  if (!title.trim()) return;
  appStore.state.todos = [{ id: crypto.randomUUID(), title: title.trim(), completed: false }, ...appStore.state.todos];
}
