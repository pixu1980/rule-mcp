/**
 * Registration idempotency: a tool name is the MCP wire contract and must be
 * unique. The startup path registers the core tools from two entry points in
 * the same process (the CLI `preAction` hook and `startServer`), so a second
 * registration must replace the first instead of advertising it twice.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { bootstrapCoreTools } from "../../_bootstrap.js";
import { clearTools, registerTool } from "../_hooks.js";
import { listTools } from "../_surface.js";

test.beforeEach(() => clearTools());

test("registering the same name twice keeps a single advertised tool", () => {
  registerTool({ entry: "action", name: "rule_tool_dup", description: "first", handler: async () => ({}) });
  registerTool({ entry: "action", name: "rule_tool_dup", description: "second", handler: async () => ({}) });

  const tools = listTools();
  assert.equal(tools.length, 1, "the same name is advertised once");
  assert.equal(tools[0].description, "second", "the latest definition wins");
});

test("re-registration preserves registry order", () => {
  registerTool({ entry: "action", name: "rule_tool_a", description: "a", handler: async () => ({}) });
  registerTool({ entry: "action", name: "rule_tool_b", description: "b", handler: async () => ({}) });
  registerTool({ entry: "action", name: "rule_tool_a", description: "a2", handler: async () => ({}) });

  assert.deepEqual(
    listTools().map((t) => t.name),
    ["rule_tool_a", "rule_tool_b"],
    "a replacement stays in place",
  );
});

test("bootstrapCoreTools is idempotent across entry points", async () => {
  await bootstrapCoreTools();
  await bootstrapCoreTools();

  const names = listTools().map((t) => t.name);
  for (const core of ["rule_tool_gateway", "rule_tool_apply"]) {
    assert.equal(names.filter((n) => n === core).length, 1, `${core} is advertised once`);
  }
});
