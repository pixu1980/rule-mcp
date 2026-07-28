// ═══════════════════════════════════════════════════════════════════════════════
//  Action: updateTodoTitle
// ═══════════════════════════════════════════════════════════════════════════════

import { appStore } from '../shared/index.js';

export function updateTodoTitle(id, title) {
  const idx = appStore.state.todos.findIndex(t => t.id === id);
  if (idx < 0) return;
  appStore.state.todos[idx] = { ...appStore.state.todos[idx], title };
}
