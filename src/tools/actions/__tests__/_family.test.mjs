

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

  for (const name of ["rule_tool_compress", "rule_tool_plan", "rule_tool_plan_docs", "rule_tool_stats", "rule_tool_usage", "rule_tool_update"]) {
    assert.ok(names.has(name), `${name} is registered by the family`);
  }
});
