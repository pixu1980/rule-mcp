

/** Branch coverage for the check tool's missing-argument answers. */
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-check-branches-"));
process.env.RULE_MCP_NO_TELEMETRY = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
process.env.RULE_MCP_NO_CACHE = "1";

const { registerCheckTool } = await import("../_check-tool.js");
const { callTool } = await import("../../router/index.js");

registerCheckTool();

test("semantic mode without code explains the missing argument", async () => {
  const result = await callTool("rule_tool_check", { skill: "rule-styleguide-css", mode: "semantic" });

  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /mode=semantic needs `code`/u);
});

test("a plain check without code names both ways to call it", async () => {
  const result = await callTool("rule_tool_check", { skill: "rule-styleguide-css" });

  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /needs `code`, or `mode=project`/u);
});
