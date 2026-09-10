

/** recomputeCore and the routing-saving estimate, over a throwaway tool. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { registerTool } from "../index.js";
import { estimateRoutingSaving, recomputeCore } from "../_compute.js";

test("recomputeCore runs a schemaless tool and refuses an unknown one", async () => {
  registerTool({
    name: "rule_tool_test_compute_probe",
    description: "a schemaless probe for recomputeCore",
    handler: async (arguments_) => ({ content: [{ type: "text", text: `echo:${arguments_.value}` }] }),
  });

  const core = await recomputeCore("rule_tool_test_compute_probe", { value: "x" });
  assert.match(core.content[0].text, /echo:x/, "the schemaless tool runs with its raw arguments");

  await assert.rejects(() => recomputeCore("rule_tool_never_registered", {}), /Unknown tool: rule_tool_never_registered/, "an unknown tool is named in the error");
});

test("estimateRoutingSaving only prices the router tool with a resolved route", () => {
  assert.equal(estimateRoutingSaving("rule_tool_search", {}, {}), undefined, "a non-router tool has no routing saving");
  assert.equal(estimateRoutingSaving("pix_tool", { content: [{ type: "text", text: "{}" }] }, {}), undefined, "a router answer without a route prices nothing");
});
