// ═══════════════════════════════════════════════════════════════════════════════
//  Computed: visibleTodos
// ═══════════════════════════════════════════════════════════════════════════════

import { ComputedSignal } from "../../core/index.js";
import { appStore, tickState } from "../shared/index.js";

export const visibleTodos = new ComputedSignal(() => {
  tickState.get();
  const todos = appStore.state.todos;
  const status = appStore.state.filters.status;
  if (status === "done") return todos.filter((t) => t.completed);
  if (status === "open") return todos.filter((t) => !t.completed);
  return todos;
});
