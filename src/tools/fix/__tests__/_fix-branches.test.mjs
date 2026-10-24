

/** Branch coverage for the fix tool's empty-scope and dry-run arms. */
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-fix-branches-"));
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
process.env.RULE_MCP_NO_TELEMETRY = "1";
process.env.RULE_MCP_NO_CACHE = "1";

const { registerFixTool } = await import("../index.js");
const { callTool } = await import("../../router/index.js");

registerFixTool();

test("an empty scope reports nothing to fix", async () => {
  const root = mkdtempSync(join(tmpdir(), "rule-fix-proj-"));
  const result = await callTool("rule_tool_fix", { files: [], path: root });

  assert.match(result.content[0].text, /No fixable files/u);
});

test("a dry run names the files it would fix", async () => {
  const root = mkdtempSync(join(tmpdir(), "rule-fix-proj-"));
  const file = join(root, "a.js");

  writeFileSync(file, "const colour = 1;\n");

  const result = await callTool("rule_tool_fix", { files: [file], path: root, dryRun: true });

  assert.match(result.content[0].text, /Would fix/u);
});
