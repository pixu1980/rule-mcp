

/** callTool's error paths: validation failures and failing guardrail results. */
import { strict as assert } from "node:assert";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { before, test } from "node:test";
import { z } from "zod/v4";

process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-mcp-call-"));
process.env.RULE_MCP_NO_TELEMETRY = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
delete process.env.RULE_MCP_NO_CACHE;

const { callTool } = await import("../index.js");
const { registerTool } = await import("../_hooks.js");

before(() => {
  registerTool({
    name: "rule_tool_probe",
    entry: "action",
    description: "a probe tool",
    zodSchema: z.object({ count: z.number().min(1).max(3) }),
    handler: (args) => (args.boom ? Promise.reject(new Error("boom")) : Promise.resolve({ content: [{ type: "text", text: `ok ${args.count}` }] })),
  });
  registerTool({
    name: "rule_tool_probe_boom",
    entry: "action",
    zodSchema: z.object({}),
    handler: () => {
      throw new Error("boom");
    },
  });
  registerTool({
    name: "rule_tool_probe_fail",
    entry: "action",
    zodSchema: z.object({}),
    handler: () => ({
      isError: true,
      _meta: { ruleGuardrails: { failCount: 2, failed: [{ id: "fp-x", label: "x", suggestion: "y", failCount: 1 }] } },
      content: [{ type: "text", text: "failed" }],
    }),
  });
});

test("a valid probe call computes and answers", async () => {
  const result = await callTool("rule_tool_probe", { count: 2 });
  assert.match(result.content[0].text, /ok 2/, "the probe computes");
  assert.notEqual(result.isError, true, "no error flag");
});

test("invalid arguments are reported without a stack trace", async () => {
  const result = await callTool("rule_tool_probe", { count: 9 });
  assert.equal(result.isError, true, "an out-of-range count errors");
  assert.match(result.content[0].text, /Invalid arguments/, "the message names the cause");
  assert.match(result.content[0].text, /count/, "the offending field is named");
});

test("a handler rejection surfaces as an enforcement error", async () => {
  const result = await callTool("rule_tool_probe_boom", {});
  assert.equal(result.isError, true, "a thrown handler errors");
  assert.match(result.content[0].text, /boom|blocked/i, "the envelope names the failure");
});

test("a failing guardrail result records and returns the error core", async () => {
  const result = await callTool("rule_tool_probe_fail", {});
  assert.equal(result.isError, true, "the failing tool reports an error");
  assert.match(result.content[0].text, /failed/, "the payload is preserved");
});
