

// Invariant 1: the tool surface is exactly ./skills - every tool traces back to it.
import test from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";

import { embeddedSkillDirs, home, surface } from "./_surface.fixture.mjs";

test.after(() => rmSync(home, { recursive: true, force: true }));

// ── Invariant 1: the surface is exactly ./skills ────────────────────────────

test("no tool is named rule_tool_rule_mcp*", () => {
  const staleTools = surface.tools.filter((name) => name.startsWith("rule_tool_rule_mcp"));
  assert.deepEqual(staleTools, [], "stale brand tools must not exist and must not be callable");
});

test("rule_tool_frontend_react exists and is served by this server", () => {
  assert.ok(surface.tools.includes("rule_tool_frontend_react"));
});

test("every tool traces back to a rule-mcp-* directory in ./skills", () => {
  const dirs = new Set(embeddedSkillDirs);
  // Action tools are registered by code, not by a skill directory.
  const ACTION = new Set([
    "rule_tool",
    "rule_tool_apply",
    "rule_tool_audit",
    "rule_tool_check",
    "rule_tool_compress",
    "rule_tool_detect",
    "rule_tool_fix",
    "rule_tool_gateway",
    "rule_tool_git",
    "rule_tool_handoff",
    "rule_tool_handon",
    "rule_tool_init",
    "rule_tool_meta",
    "rule_tool_plan",
    "rule_tool_impersonation",
    "rule_tool_process_adr",
    "rule_tool_review",
    "rule_tool_search",
    "rule_tool_stats",
    "rule_tool_structural",
    "rule_tool_sync",
    "rule_tool_update",
    "rule_tool_usage",
  ]);
  for (const name of surface.tools) {
    if (ACTION.has(name)) {
      continue;
    }
    const dir = `rule-mcp-${name.replace(/^rule_tool_/, "").replaceAll("_", "-")}`;
    assert.ok(dirs.has(dir), `${name} has no backing directory in ./skills (expected ${dir})`);
  }
});

test("every skill the registry reports starts with rule-mcp-", () => {
  const foreign = surface.skills.filter((name) => !name.startsWith("rule-mcp-"));
  assert.deepEqual(foreign, [], "a foreign skill name would mint a foreign rule_tool_* tool");
});

test("the surface size matches the embedded skill count", () => {
  // All directories minus the bare `rule-mcp` router skill which is registered as
  // the dispatcher tool rather than a skill tool.
  const expectedSkills = embeddedSkillDirs.filter((d) => d.startsWith("rule-mcp-")).length;
  assert.equal(surface.skills.length, expectedSkills);
  assert.ok(surface.bytes < 130_000, `tool schemas grew to ${surface.bytes} bytes - the surface is leaking again`);
});
