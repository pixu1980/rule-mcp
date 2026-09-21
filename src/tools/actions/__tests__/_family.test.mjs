// SPDX-FileCopyrightText: 2025-2026 pixu1980
// SPDX-License-Identifier: MIT
/**
 * ARCH-6.2: the action family registers through one function, not six siblings.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { clearTools, listTools } from "../../router/index.js";
import { registerActionTools } from "../index.js";

test("registerActionTools mints the six action-family tools", () => {
  clearTools();
  registerActionTools();

  const names = new Set(listTools().map((tool) => tool.name));

  for (const name of ["pix_tool_compress", "pix_tool_plan", "pix_tool_plan_docs", "pix_tool_stats", "pix_tool_usage", "pix_tool_update"]) {
    assert.ok(names.has(name), `${name} is registered by the family`);
  }
});
