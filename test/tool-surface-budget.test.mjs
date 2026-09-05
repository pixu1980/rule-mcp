/**
 * @module test/tool-surface-budget.test
 *
 * The tool surface is the only output paid on every model turn, so it is the
 * one worth a regression test. Four properties:
 *
 *   - it stays under budget
 *   - registration order is stable, so a prompt cache is not invalidated by a
 *     reordered tool list
 *   - nothing version- or time-dependent leaks into a description, for the same
 *     reason
 *   - JSON tool output stays JSON, so the decoration layer never corrupts data
 *
 * Ported upstream behavior with the tool names rebranded to the rule-native
 * surface and the annotation assertions adapted to the current target surface.
 */

import test from "node:test";
import assert from "node:assert/strict";

process.env.RULE_MCP_NO_TELEMETRY = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1";

const { loadAllSkills } = await import("../src/core/skills.js");
const { callTool, listTools } = await import("../src/tools/router.js");
const { TOOL_SURFACE_BUDGET_TOKENS } = await import("../src/core/tool-budget.js");

await loadAllSkills(true);

test("no tool declares two schemas", async () => {
  const { declaredTools } = await import("../src/tools/router.js");
  const both = declaredTools()
    .filter((tool) => tool.zodSchema && tool.inputSchema)
    .map((tool) => tool.name);

  assert.deepEqual(both, [], "these tools declare a zodSchema and an inputSchema; delete the second");
});

test("every tool advertises something, unless it takes nothing", () => {
  const tools = listTools();
  const NO_ARGUMENTS = new Set(["rule_tool_update"]);
  const empty = tools
    .filter((tool) => Object.keys(tool.inputSchema?.properties ?? {}).length === 0)
    .map((tool) => tool.name)
    .filter((name) => !NO_ARGUMENTS.has(name));

  assert.deepEqual(empty, [], "a tool advertising no parameters means its schema conversion failed");
});

test("tools/list stays within its per-turn token budget", () => {
  const weight = Math.ceil(JSON.stringify(listTools()).length / 4);
  assert.ok(
    weight <= TOOL_SURFACE_BUDGET_TOKENS,
    `tools/list is ~${weight} tokens, over the ${TOOL_SURFACE_BUDGET_TOKENS} budget. ` +
      "This is paid on every model turn. Trim the surface, or raise the budget deliberately.",
  );
  console.log(`  tools/list: ~${weight} / ${TOOL_SURFACE_BUDGET_TOKENS} tokens`);
});

test("registration order is deterministic", async () => {
  const first = listTools().map((tool) => tool.name);
  await loadAllSkills(true);
  const second = listTools().map((tool) => tool.name);
  assert.deepEqual(second, first, "a reordered tool list invalidates the prompt cache for no reason");
});

test("no tool description carries a version, a date or a path", () => {
  for (const tool of listTools()) {
    const description = tool.description ?? "";
    assert.ok(!/\b\d+\.\d+\.\d+\b/.test(description), `${tool.name} embeds a version in its description`);
    assert.ok(!/\b20\d\d-\d\d-\d\d\b/.test(description), `${tool.name} embeds a date in its description`);
    assert.ok(
      !description.includes("/Users/") && !description.includes("/home/"),
      `${tool.name} embeds an absolute path`,
    );
  }
});

test("no mutating tool is advertised as read-only", () => {
  // The source suite asserted readOnlyHint on specific tools; until the
  // annotations surface lands (Phase 4) the invariant that holds on the target
  // is the negative one: a mutating tool must never claim to be read-only.
  const byName = new Map(listTools().map((tool) => [tool.name, tool]));
  // rule_tool_gateway is read-only (receipts live in memory, no writes), so it
  // may advertise readOnlyHint and is absent here.
  for (const name of [
    "rule_tool_apply",
    "rule_tool_fix",
    "rule_tool_process_adr",
    "rule_tool_plan_docs",
    "rule_tool_process_handoff",
    "rule_tool_update",
  ]) {
    assert.notEqual(
      byName.get(name)?.annotations?.readOnlyHint,
      true,
      `${name} mutates the filesystem and must never be advertised read-only`,
    );
  }
});

test("a JSON tool result is still parseable after decoration", async () => {
  const result = await callTool("pix_tool", { prompt: "react component with a form" });
  const parsed = JSON.parse(result.content[0].text);
  assert.ok(typeof parsed.route === "string", "the router's JSON must survive compression and fingerprint removal");
});
