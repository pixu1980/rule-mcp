// ═══════════════════════════════════════════════════════════════════════════════
//  Action: deleteTodo
// ═══════════════════════════════════════════════════════════════════════════════

import { appStore } from '../shared/index.js';

export function deleteTodo(id) { appStore.state.todos = appStore.state.todos.filter(t => t.id !== id); }
