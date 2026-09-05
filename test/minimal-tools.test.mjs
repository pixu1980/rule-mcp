/**
 * @module test/minimal-tools
 *
 * Compatibility: the full server exposes ~95 MCP tools, which several clients
 * cap or truncate (Cursor, Copilot) and which cost tokens on every turn for any
 * model. A minimal-surface mode must collapse this to a small, fixed dispatcher
 * + action set so the server stays usable behind those clients.
 *
 * Spawns the CLI so the env-gated registration is read at process start.
 */

import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { strict as assert } from "node:assert";

const bin = fileURLToPath(new URL("../bin/rule-mcp.js", import.meta.url));

const ACTION_TOOL_COUNT = 17; // rule_tool_compress joined the surface (item 9 subset)
// Derived from disk, not a threshold: the old `> 90` only held on machines whose
// ~/.agents/skills inflated the surface with stale directories from another brand.
const embeddedSkillCount = readdirSync(new URL("../skills", import.meta.url).pathname, { withFileTypes: true }).filter(
  (e) => e.isDirectory() && e.name.startsWith("rule-"),
).length;

/** The guaranteed minimal tool surface. */
const MINIMAL = [
  "pix_tool",
  "rule_tool_update",
  "rule_tool_gateway",
  "rule_tool_apply",
  "rule_tool_search",
  "rule_tool_check",
  "rule_tool_scaffold",
  "rule_tool_detect",
  "rule_tool_process_handoff",
  "rule_tool_component",
].sort();

function toolNames(extraEnvironment) {
  const r = spawnSync(process.execPath, [bin, "tools", "list", "--json"], {
    encoding: "utf8",
    env: { ...process.env, RULE_MCP_NO_AUTOUPDATE: "1", ...extraEnvironment },
  });
  const parsed = JSON.parse(r.stdout);
  return (parsed.tools ?? parsed).map((t) => t.name);
}

console.log("=== Minimal Tool Surface Tests ===\n");

// ── Full surface ──
const full = toolNames({});
assert.equal(
  full.length,
  embeddedSkillCount + ACTION_TOOL_COUNT,
  `full surface must be ./skills + action tools (got ${full.length}, expected ${embeddedSkillCount + ACTION_TOOL_COUNT})`,
);
console.log(
  `  ✅ full surface exposes ${full.length} tools (${embeddedSkillCount} skills + ${ACTION_TOOL_COUNT} action)`,
);

// ── Minimal via RULE_MCP_MINIMAL_TOOLS (convention-aligned name) ──
const minimal = toolNames({ RULE_MCP_MINIMAL_TOOLS: "1" });
assert.deepEqual([...minimal].sort(), MINIMAL, "minimal mode exposes exactly the allowlist");
console.log(`  ✅ RULE_MCP_MINIMAL_TOOLS → ${minimal.length} tools`);

// ── Default is OFF (opt-in): the retired RULE_MCP_STRICT_MODE no longer applies ──
const retiredAliasIgnored = toolNames({ RULE_MCP_STRICT_MODE: "1" });
assert.equal(
  retiredAliasIgnored.length,
  embeddedSkillCount + ACTION_TOOL_COUNT,
  `removed RULE_MCP_STRICT_MODE alias must NOT trigger minimal mode (got ${retiredAliasIgnored.length}, expected ${embeddedSkillCount + ACTION_TOOL_COUNT})`,
);
console.log(`  ✅ retired RULE_MCP_STRICT_MODE ignored → ${retiredAliasIgnored.length} tools (full)`);

// ── The dispatcher/action tools an agent needs are all present ──
for (const t of ["pix_tool", "rule_tool_gateway", "rule_tool_apply", "rule_tool_check"]) {
  assert.ok(minimal.includes(t), `minimal surface must include ${t}`);
}
console.log("  ✅ dispatcher + action tools present in minimal mode");

console.log("\nminimal-tools: all checks passed");
