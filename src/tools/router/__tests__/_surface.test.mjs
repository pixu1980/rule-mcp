

/** The tool surface: annotations, declared and list views, schema conversion. */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { z } from "zod/v4";

import { registerTool, clearTools } from "../_hooks.js";
import { declaredTools, listTools } from "../_surface.js";

test.beforeEach(() => clearTools());

test("annotations mark reads idempotent and non-idempotent, nothing for mutators", () => {
  registerTool({ entry: "action", name: "rule_tool_apply", description: "w", handler: async () => ({}) });
  registerTool({ entry: "action", name: "rule_tool_stats", description: "r", handler: async () => ({}) });
  registerTool({ entry: "action", name: "rule_tool_compress", description: "r", handler: async () => ({}) });

  const tools = listTools();
  const raw = declaredTools();
  assert.equal(raw.length, 3, "all three are declared");
  const apply = tools.find((t) => t.name === "rule_tool_apply");
  assert.equal(apply.annotations, undefined, "a mutator carries no annotation");

  const stats = tools.find((t) => t.name === "rule_tool_stats");
  assert.equal(stats.annotations?.readOnlyHint, true, "a non-idempotent read is read-only");
  assert.equal(stats.annotations?.idempotentHint, undefined, "but no idempotent hint");

  const compress = tools.find((t) => t.name === "rule_tool_compress");
  assert.equal(compress.annotations?.readOnlyHint, true, "an idempotent read is read-only");
  assert.equal(compress.annotations?.idempotentHint, true, "and idempotent");
});

test("listTools converts zod schemas and tolerates plain schemas", () => {
  registerTool({
    name: "rule_tool_z",
    entry: "action",
    description: "zod tool",
    zodSchema: z.object({ count: z.number().optional() }),
    handler: async () => ({ content: [] }),
  });
  registerTool({
    entry: "action",
    name: "rule_tool_plain",
    description: "plain",
    inputSchema: { type: "object", properties: { a: { type: "string" } } },
    handler: async () => ({ content: [] }),
  });

  const listed = listTools();
  assert.ok(
    listed.some((t) => t.name === "rule_tool_z" && t.inputSchema?.properties?.count),
    "the zod schema converts",
  );
  assert.ok(
    listed.some((t) => t.name === "rule_tool_plain" && t.inputSchema?.properties?.a),
    "a plain schema passes through",
  );
});

// ── PERF-8: the schema conversion is paid once per registry, not per connect ──

test("listTools is memoized on the registry generation", async () => {
  const { clearTools, registerTool, toolsGeneration } = await import("../_hooks.js");
  const { listTools } = await import("../_surface.js");
  const { z } = await import("zod/v4");

  clearTools();
  registerTool({ entry: "action", name: "rule_tool_memo_a", description: "a", zodSchema: z.object({ q: z.string() }), handler: async () => ({ content: [] }) });

  const first = listTools();
  assert.equal(listTools(), first, "an unchanged registry returns the same converted array");

  const generation = toolsGeneration();
  registerTool({ entry: "action", name: "rule_tool_memo_b", description: "b", zodSchema: z.object({ q: z.string() }), handler: async () => ({ content: [] }) });

  assert.notEqual(toolsGeneration(), generation, "registering bumps the generation");
  const second = listTools();
  assert.notEqual(second, first, "and the memo is rebuilt");
  assert.equal(second.length, 2);

  clearTools();
  assert.deepEqual(listTools(), [], "clearing invalidates it too");
});
