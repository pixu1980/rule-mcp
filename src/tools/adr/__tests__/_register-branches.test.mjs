/** Branch coverage for the ADR tool's nullish defaults. */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-mcp-adr-branches-"));
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
process.env.RULE_MCP_NO_TELEMETRY = "1";
process.env.RULE_MCP_NO_CACHE = "1";

const { registerProcessAdrTool } = await import("../_register.js");
const { callTool } = await import("../../router/index.js");

registerProcessAdrTool();

test("missing optional fields fall back to the defaults", async () => {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-adr-proj-"));

  try {
    const result = await callTool("rule_tool_process_adr", {
      title: "Prefer the defaults when the caller omits them",
      projectDir: root,
    });

    assert.equal(result.isError, undefined);
    assert.match(result.content[0].text, /Status: accepted/u);
    assert.match(result.content[0].text, /Tags: architecture/u);
    assert.match(readFileSync(join(root, "docs", "adr", "001-prefer-the-defaults-when-the-caller-omits-them.md"), "utf8"), /## Context/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
