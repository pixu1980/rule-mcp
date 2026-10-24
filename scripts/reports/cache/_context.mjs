/** @module scripts/reports/cache/context - flags, scratch state dir and the lazily imported runtime */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const cliArguments = process.argv.slice(2);
export const asJson = cliArguments.includes("--json");
export const exactOnly = cliArguments.includes("--exact-only");

if (exactOnly) {
  process.env.RULE_MCP_CACHE_EXACT_ONLY = "1";
}

export const stateDir = mkdtempSync(join(tmpdir(), "rule-mcp-cache-report-"));
process.env.RULE_MCP_STATE_DIR = stateDir;
process.env.RULE_MCP_NO_TELEMETRY = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
delete process.env.RULE_MCP_NO_CACHE;

const { loadAllSkills } = await import("../../../src/core/skills/index.js");
export const { callTool, entryPathOf } = await import("../../../src/tools/router/index.js");
export const { cacheClear, cacheEntries } = await import("../../../src/core/cache/tool-cache/index.js");
export const { CORPUS } = await import("../../../tests/fixtures/routing-corpus.mjs");

await loadAllSkills(true);
