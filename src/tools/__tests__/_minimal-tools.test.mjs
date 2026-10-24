

/**
 * @module test/minimal-tools
 *
 * A minimal-surface mode collapses the full catalog to a fixed dispatcher +
 * action set (ADR 075 / ADR 115). Spawns the CLI so env-gated registration is
 * read at process start.
 */

import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { strict as assert } from "node:assert";
import { MINIMAL_ALLOWLIST } from "../../core/skills/_minimal.js";
import { REGISTERED_BY_CODE } from "../../core/skills/_skill-tools.js";

const bin = fileURLToPath(new URL("../../../bin/rule-mcp.js", import.meta.url));

const embeddedSkillCount = readdirSync(new URL("../../../skills", import.meta.url).pathname, { withFileTypes: true }).filter(
  (e) => e.isDirectory() && e.name.startsWith("rule-mcp-"),
).length;

/** Core/action tools that are not minted 1:1 from an exposing skill. */
const CORE_TOOL_COUNT = 24;

/** Guaranteed minimal tool surface (sorted). */
const MINIMAL = [...MINIMAL_ALLOWLIST].sort();

function toolNames(extraEnvironment) {
  const r = spawnSync(process.execPath, [bin, "tools", "list", "--json"], {
    encoding: "utf8",
    env: { ...process.env, RULE_MCP_NO_AUTOUPDATE: "1", ...extraEnvironment },
  });
  const parsed = JSON.parse(r.stdout);
  return (parsed.tools ?? parsed).map((t) => t.name);
}

console.log("=== Minimal Tool Surface Tests ===\n");

const expectedFull = embeddedSkillCount - REGISTERED_BY_CODE.size + CORE_TOOL_COUNT;

// ── Full surface ──
const full = toolNames({});
assert.equal(full.length, expectedFull, `full surface must be skills-minus-REGISTERED_BY_CODE + core (got ${full.length}, expected ${expectedFull})`);
assert.ok(!full.includes("rule_tool_scaffold"), "scaffold tool removed (ADR 115)");
assert.ok(!full.includes("rule_tool_component"), "component tool removed (ADR 115)");
assert.ok(!full.includes("rule_tool_form"), "form tool removed (ADR 115)");
assert.ok(!full.includes("rule_tool_a11y_report"), "a11y_report tool removed (ADR 115)");
assert.ok(!full.includes("rule_tool_process_compression"), "process-compression skill-tool removed (ADR 115)");
assert.ok(!full.includes("rule_tool_process_handoff"), "process_handoff renamed (ADR 115)");
assert.ok(full.includes("rule_tool_handoff"), "rule_tool_handoff present");
assert.ok(full.includes("rule_tool_handon"), "rule_tool_handon present");
assert.ok(full.includes("rule_tool_init"), "rule_tool_init present");
assert.ok(full.includes("rule_tool_compress"), "rule_tool_compress present");
console.log(`  ✅ full surface exposes ${full.length} tools`);

// ── Minimal via RULE_MCP_MINIMAL_TOOLS ──
const minimal = toolNames({ RULE_MCP_MINIMAL_TOOLS: "1" });
assert.deepEqual([...minimal].sort(), MINIMAL, "minimal mode exposes exactly the allowlist");
console.log(`  ✅ RULE_MCP_MINIMAL_TOOLS → ${minimal.length} tools`);

// ── Default is OFF: retired RULE_MCP_STRICT_MODE no longer applies ──
const retiredAliasIgnored = toolNames({ RULE_MCP_STRICT_MODE: "1" });
assert.equal(retiredAliasIgnored.length, expectedFull, "removed RULE_MCP_STRICT_MODE alias must NOT trigger minimal mode");
console.log(`  ✅ retired RULE_MCP_STRICT_MODE ignored → ${retiredAliasIgnored.length} tools (full)`);

for (const t of ["rule_tool", "rule_tool_gateway", "rule_tool_apply", "rule_tool_check"]) {
  assert.ok(minimal.includes(t), `minimal surface must include ${t}`);
}
console.log("  ✅ dispatcher + action tools present in minimal mode");

console.log("\nminimal-tools: all checks passed");
