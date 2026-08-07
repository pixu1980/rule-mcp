// ═══════════════════════════════════════════════════════════════════════════════
//  Shared - re-exports store, tickState for the demo app
// ═══════════════════════════════════════════════════════════════════════════════

import { Store, StateSignal } from "../../core/index.js";

// 1. Store
export const appStore = new Store({
  todos: [
    { id: "1", title: "Learn template engine syntax", completed: false },
    { id: "2", title: "Build something awesome", completed: true },
    { id: "3", title: "Integrate filters and directives", completed: false },
  ],
  filters: { status: "all" },
  preferences: { language: "en", theme: "light" },
  ui: {
    appTitle: "📋 Vanilla Reactive Todo",
    description:
      "Built with <strong>template engine</strong> syntax, <strong>filter pipes</strong>, and <strong>directives</strong>.",
    extraInfo: "Click any todo to toggle completion.",
  },
});

// 2. tickState
export const tickState = new StateSignal(0, { equals: () => false });

// 3. Store → tick bridge
window.addEventListener("store:change", () => {
  tickState.set(performance.now());
});
