// Invariant 1: the tool surface is exactly ./skills - every tool traces back to it.
import test from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";

import { embeddedSkillDirs, home, surface } from "./_surface.fixture.mjs";

test.after(() => rmSync(home, { recursive: true, force: true }));

// ── Invariant 1: the surface is exactly ./skills ────────────────────────────

test("no tool is named pix_pix*", () => {
  const pix = surface.tools.filter((name) => name.startsWith("pix_tool_pix"));
  assert.deepEqual(pix, [], "stale brand tools must not exist and must not be callable");
});

test("pix_tool_frontend_react exists and is served by this server", () => {
  assert.ok(surface.tools.includes("pix_tool_frontend_react"));
});

test("every tool traces back to a pix-* directory in ./skills", () => {
  const dirs = new Set(embeddedSkillDirs);
  // Action tools are registered by code, not by a skill directory.
  const ACTION = new Set([
    "pix_tool",
    "pix_tool_apply",
    "pix_tool_check",
    "pix_tool_component",
    "pix_tool_compress",
    "pix_tool_a11y_report",
    "pix_tool_detect",
    "pix_tool_fix",
    "pix_tool_gateway",
    "pix_tool_plan",
    "pix_tool_plan_docs",
    "pix_tool_process_handon",
    "pix_tool_scaffold",
    "pix_tool_search",
    "pix_tool_stats",
    "pix_tool_update",
    "pix_tool_usage",
  ]);
  for (const name of surface.tools) {
    if (ACTION.has(name)) {
      continue;
    }
    const dir = `pix-${name.replace(/^pix_tool_/, "").replaceAll("_", "-")}`;
    assert.ok(dirs.has(dir), `${name} has no backing directory in ./skills (expected ${dir})`);
  }
});

test("every skill the registry reports starts with pix-", () => {
  const foreign = surface.skills.filter((name) => !name.startsWith("pix-"));
  assert.deepEqual(foreign, [], "a foreign skill name would mint a foreign pix_* tool");
});

test("the surface size matches the embedded skill count", () => {
  // All directories minus the bare `pix` router skill which is registered as
  // the dispatcher tool rather than a skill tool.
  const expectedSkills = embeddedSkillDirs.filter((d) => d.startsWith("pix-")).length;
  assert.equal(surface.skills.length, expectedSkills);
  assert.ok(surface.bytes < 130_000, `tool schemas grew to ${surface.bytes} bytes - the surface is leaking again`);
});
