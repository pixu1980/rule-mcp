

/** Branch coverage for the surface normalization and the schema fallback. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { registerTool, resetTools } from "../_registry.js";
import { listTools } from "../_surface.js";

const handler = async () => ({ content: [] });

test("a schema without properties or type is normalized to an object", () => {
  resetTools();
  registerTool({ name: "rule_tool_probe", entry: "action", description: undefined, zodSchema: { toJSONSchema: () => ({}) }, handler });

  const [tool] = listTools();

  assert.deepEqual(tool.inputSchema, { type: "object", properties: {}, required: [] });
  assert.equal(tool.description, "");
});

test("a schema that cannot convert falls back to the declared input schema", () => {
  resetTools();
  registerTool({
    name: "rule_tool_broken",
    entry: "action",
    description: "a tool",
    zodSchema: {
      toJSONSchema() {
        throw new Error("cannot convert");
      },
    },
    handler,
  });

  const [tool] = listTools();

  assert.deepEqual(tool.inputSchema, { type: "object", properties: {} });
});

test("a tool with no schema at all gets the empty object schema", () => {
  resetTools();
  registerTool({ name: "rule_tool_plain", entry: "action", description: "a tool", handler });

  const [tool] = listTools();

  assert.deepEqual(tool.inputSchema, { type: "object", properties: {} });
  resetTools();
});
