// ═══════════════════════════════════════════════════════════════════════════════
//  Computed: stats
// ═══════════════════════════════════════════════════════════════════════════════

import { ComputedSignal } from "../../core/index.js";
import { appStore, tickState } from "../shared/index.js";

export const stats = new ComputedSignal(() => {
  tickState.get();
  const todos = appStore.state.todos;
  return {
    total: todos.length,
    completed: todos.filter((t) => t.completed).length,
    open: todos.filter((t) => !t.completed).length,
  };
});
