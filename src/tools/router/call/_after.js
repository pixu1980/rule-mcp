// SPDX-FileCopyrightText: 2025-2026 pixu1980
// SPDX-License-Identifier: MIT
/** After-hooks: fire-and-forget decoration registered per tool. */
import { _afterHooks } from "../_hooks.js";

/** Run the "after" hooks for one call, never awaited. */
export function runAfterHooks(name, args, final) {
  const hooks = [...(_afterHooks["*"] || []), ...(_afterHooks[name] || [])];

  for (const function_ of hooks) {
    function_(name, args, final).catch(() => {});
  }
}
