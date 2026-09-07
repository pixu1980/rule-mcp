/** The tool surface: annotations, declared and list views, schema conversion. */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { z } from "zod/v4";

import { registerTool, clearTools } from "../_hooks.js";
import { declaredTools, listTools } from "../_surface.js";

test.beforeEach(() => clearTools());

test("annotations mark reads idempotent and non-idempotent, nothing for mutators", () => {
  registerTool({ name: "rule_tool_apply", description: "w", handler: async () => ({}) });
  registerTool({ name: "rule_tool_stats", description: "r", handler: async () => ({}) });
  registerTool({ name: "rule_tool_compress", description: "r", handler: async () => ({}) });

  const tools = declaredTools();
  const apply = tools.find((t) => t.name === "rule_tool_apply");
  assert.equal(apply.annotations, undefined, "a mutator carries no annotation");

  const stats = tools.find((t) => t.name === "rule_tool_stats");
  assert.equal(stats.annotations?.readOnlyHint, true, "a non-idempotent read is read-only");
  assert.equal(stats.annotations?.idempotentHint, false, "but not idempotent");

  const compress = tools.find((t) => t.name === "rule_tool_compress");
  assert.equal(compress.annotations?.readOnlyHint, true, "an idempotent read is read-only");
  assert.equal(compress.annotations?.idempotentHint, true, "and idempotent");
});

test("listTools converts zod schemas and tolerates plain schemas", () => {
  registerTool({
    name: "rule_tool_z",
    description: "zod tool",
    zodSchema: z.object({ count: z.number().optional() }),
    handler: async () => ({ content: [] }),
  });
  registerTool({ name: "rule_tool_plain", description: "plain", inputSchema: { type: "object", properties: { a: { type: "string" } } }, handler: async () => ({ content: [] }) });

  const listed = listTools();
  assert.ok(listed.some((t) => t.name === "rule_tool_z" && t.inputSchema?.properties?.count), "the zod schema converts");
  assert.ok(listed.some((t) => t.name === "rule_tool_plain" && t.inputSchema?.properties?.a), "a plain schema passes through");
});