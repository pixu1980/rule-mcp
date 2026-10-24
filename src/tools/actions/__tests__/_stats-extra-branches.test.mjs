

/** Branch coverage for the stats rollups, the event window and the ledger fallbacks. */
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const state = mkdtempSync(join(tmpdir(), "rule-stats-extra-"));
process.env.RULE_MCP_STATE_DIR = state;
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
process.env.RULE_MCP_NO_CACHE = "1";

const { getProjectPaths } = await import("../../../cli/paths/index.js");
const { registerStatsTool } = await import("../_stats.js");
const { callTool } = await import("../../router/index.js");

registerStatsTool();

test("the week window drops an event without a timestamp", async () => {
  const events = [
    { tool: "pix_tool", ts: Date.now(), ms: 1 },
    { tool: "pix_tool", ms: 1 },
  ];

  writeFileSync(join(getProjectPaths().dir, "telemetry.jsonl"), events.map((event) => JSON.stringify(event)).join("\n"));

  const result = await callTool("rule_tool_stats", { scope: "week" });

  assert.match(result.content[0].text, /Last 7 days/u);
});

test("rollups with missing fields count as zero", async () => {
  writeFileSync(join(getProjectPaths().dir, "telemetry-rollup.json"), JSON.stringify([{}, { date: "2025-01-01" }]));

  const result = await callTool("rule_tool_stats", { scope: "all" });

  assert.match(result.content[0].text, /Archived days/u);
  assert.match(result.content[0].text, /0 calls/u);
});

test("the ledger defaults every missing field and prints the finite dollar figure", { skip: process.platform === "win32" }, async () => {
  const bin = mkdtempSync(join(tmpdir(), "rule-stats-bin-"));
  const fake = join(bin, "tokensave");

  writeFileSync(fake, "#!/bin/sh\nprintf '%s' '{}'\n");
  chmodSync(fake, 0o755);
  process.env.PATH = `${bin}:${process.env.PATH}`;

  const missing = await callTool("rule_tool_stats", { scope: "session" });

  assert.match(missing.content[0].text, /0 TokenSave calls over 30d/u);

  writeFileSync(fake, '#!/bin/sh\nprintf \'%s\' \'{"calls":2,"range":"7d","saved_tokens":5,"usd":0.25}\'\n');

  const full = await callTool("rule_tool_stats", { scope: "session" });

  assert.match(full.content[0].text, /2 TokenSave calls over 7d saved ~5 tokens \(\$0\.25\)/u);
});
