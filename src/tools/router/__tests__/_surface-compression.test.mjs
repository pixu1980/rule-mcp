/**
 * Phase 2b (plan: execution-plan.md), tools/list descriptions.
 *
 * The tool surface is paid on every model turn before the model has decided to
 * do anything. Names, schemas and annotations are the machine contract and are
 * never touched; the prose description is what the model reads to choose a
 * tool, so it goes through the same compression pass the results already do.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

process.env.RULE_MCP_NO_TELEMETRY = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
delete process.env.RULE_MCP_NO_COMPRESSION;
delete process.env.RULE_MCP_COMPRESSION_LEVEL;

const { clearTools, registerTool, listTools } = await import("../index.js");

const VERBOSE =
  "The gateway really just routes a prompt to the right skill and then loads the exact evidence that the skill needs. You should always make sure to check the code against the guardrails before you finish.";
const SHORT = "zod tool";

test("tools/list descriptions compress when compression is on; names and schemas stay", () => {
  clearTools();
  registerTool({
    name: "rule_tool_verbose",
    entry: "action",
    description: VERBOSE,
    zodSchema: undefined,
    inputSchema: { type: "object", properties: { q: { type: "string", description: "a query" } } },
    handler: async () => ({ content: [] }),
  });
  registerTool({ entry: "action", name: "rule_tool_terse", description: SHORT, handler: async () => ({ content: [] }) });

  const listed = listTools();
  const verbose = listed.find((tool) => tool.name === "rule_tool_verbose");
  const terse = listed.find((tool) => tool.name === "rule_tool_terse");

  assert.ok(verbose.description.length < VERBOSE.length, `the verbose description sheds filler: ${VERBOSE.length} -> ${verbose.description.length}`);
  assert.ok(verbose.description.includes("gateway") && verbose.description.includes("guardrails"), "the substance survives");
  assert.equal(terse.description, SHORT, "a description with no filler is unchanged");
  assert.deepEqual(verbose.inputSchema, { type: "object", properties: { q: { type: "string", description: "a query" } } }, "the schema is the machine contract and never changes");
});

test("tools/list descriptions are raw when compression is off", () => {
  process.env.RULE_MCP_NO_COMPRESSION = "1";
  try {
    const listed = listTools();
    const verbose = listed.find((tool) => tool.name === "rule_tool_verbose");
    assert.equal(verbose.description, VERBOSE, "the opt-out keeps the full prose");
  } finally {
    delete process.env.RULE_MCP_NO_COMPRESSION;
  }
});

test.after(() => {
  clearTools();
});
