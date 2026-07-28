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
import { fileURLToPath } from "node:url";
import { strict as assert } from "node:assert";

const bin = fileURLToPath(new URL("../bin/rule-mcp.js", import.meta.url));

/** The guaranteed minimal tool surface. */
const MINIMAL = [
  "rule", "pix_update", "pix_gateway", "pix_apply",
  "pix_search", "pix_check", "pix_scaffold", "pix_detect",
  "pix_process_handoff", "pix_component",
].sort();

function toolNames(extraEnv) {
  const r = spawnSync(process.execPath, [bin, "tools", "list", "--json"], {
    encoding: "utf8",
    env: { ...process.env, RULE_MCP_NO_AUTOUPDATE: "1", ...extraEnv },
  });
  const parsed = JSON.parse(r.stdout);
  return (parsed.tools ?? parsed).map((t) => t.name);
}

console.log("=== Minimal Tool Surface Tests ===\n");

// ── Full surface ──
const full = toolNames({});
assert.ok(full.length > 90, `full surface should expose >90 tools (got ${full.length})`);
assert.ok(full.includes("pix_frontend_react"), "full surface includes skill tools");
console.log(`  ✅ full surface exposes ${full.length} tools`);

// ── Minimal via RULE_MCP_MINIMAL_TOOLS (convention-aligned name) ──
const minimal = toolNames({ RULE_MCP_MINIMAL_TOOLS: "1" });
assert.deepEqual(minimal.slice().sort(), MINIMAL, "minimal mode exposes exactly the allowlist");
console.log(`  ✅ RULE_MCP_MINIMAL_TOOLS → ${minimal.length} tools`);

// ── Default is OFF (opt-in): the legacy RULE_MCP_STRICT_MODE no longer applies ──
const legacyIgnored = toolNames({ RULE_MCP_STRICT_MODE: "1" });
assert.ok(legacyIgnored.length > 90, "removed RULE_MCP_STRICT_MODE alias must NOT trigger minimal mode");
console.log(`  ✅ legacy RULE_MCP_STRICT_MODE ignored → ${legacyIgnored.length} tools (full)`);

// ── The dispatcher/action tools an agent needs are all present ──
for (const t of ["rule", "pix_gateway", "pix_apply", "pix_check"]) {
  assert.ok(minimal.includes(t), `minimal surface must include ${t}`);
}
console.log("  ✅ dispatcher + action tools present in minimal mode");

console.log("\nminimal-tools: all checks passed");
