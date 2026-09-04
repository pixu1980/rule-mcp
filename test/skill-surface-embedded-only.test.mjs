// test/skill-surface-embedded-only.test.mjs
//
// The tool surface of this server is defined by ./skills in THIS repository and
// by nothing else.
//
// It used to merge ~/.agents/skills into the surface, and any directory holding
// a SKILL.md became a tool under the pix_ prefix. On the machine that ran
// the 2026-08-04 audit that meant 79 stale `rule-*` directories from the previous
// brand resurfaced as callable `pix_pix_*` tools - plus generic skills such
// as `test-driven-development` renamed to `pix_test_driven_development`.
// 176 tools instead of 88, half of them foreign, ~54k tokens of tool schemas in
// every model turn.
//
// Two invariants, both load-bearing:
//   1. every tool traces back to a `rule-*` directory in ./skills;
//   2. nothing in the home directory can add, rename, or shadow a tool.
//
// The home directory is also where plugin.js used to be imported from, i.e.
// arbitrary code executed in-process at startup (audit finding 15). Dropping the
// home surface closes that too.

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Load the server in a child process with HOME pointed at `home`, and return the
 * resulting tool names plus the skill names the registry saw.
 */
function surfaceWith(home) {
  const script = `
    const { loadAllSkills } = await import(${JSON.stringify(new URL("../src/core/skills.js", import.meta.url).href)});
    await loadAllSkills();
    const { listTools, getSkillNames } = await import(${JSON.stringify(new URL("../src/tools/router.js", import.meta.url).href)});
    process.stdout.write(JSON.stringify({
      tools: listTools().map((t) => t.name),
      skills: getSkillNames(),
      bytes: JSON.stringify(listTools()).length,
    }));
  `;
  const out = execFileSync(process.execPath, ["--input-type=module", "--eval", script], {
    cwd: new URL("..", import.meta.url).pathname,
    env: { ...process.env, HOME: home, USERPROFILE: home, RULE_MCP_NO_AUTOUPDATE: "1" },
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  return JSON.parse(out);
}

/** A home directory carrying skills that must NOT reach the tool surface. */
function makeHostileHome() {
  const home = mkdtempSync(join(tmpdir(), "rule-home-"));
  const skills = join(home, ".agents", "skills");
  // A stale skill from a previous brand - rule-* in home must NOT become
  // a pix_* tool because rule only scans rule-* from embedded.
  mkdirSync(join(skills, "rule-frontend-react"), { recursive: true });
  writeFileSync(join(skills, "rule-frontend-react", "SKILL.md"), "---\nname: rule-frontend-react\n---\nstale\n");
  // A generic third-party skill.
  mkdirSync(join(skills, "test-driven-development"), { recursive: true });
  writeFileSync(join(skills, "test-driven-development", "SKILL.md"), "---\nname: tdd\n---\ngeneric\n");
  // A home copy that tries to SHADOW a real embedded skill with other content.
  mkdirSync(join(skills, "rule-frontend-react"), { recursive: true });
  writeFileSync(join(skills, "rule-frontend-react", "SKILL.md"), "---\nname: rule-frontend-react\n---\nSHADOWED\n");
  // A plugin that would be imported and executed at startup.
  mkdirSync(join(skills, "evil-plugin"), { recursive: true });
  writeFileSync(join(skills, "evil-plugin", "SKILL.md"), "---\nname: evil\n---\nx\n");
  writeFileSync(join(skills, "evil-plugin", "plugin.js"), "export const guardrails = [];\n");
  return home;
}

const embeddedSkillDirs = readdirSync(new URL("../skills", import.meta.url).pathname, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const home = makeHostileHome();
const surface = surfaceWith(home);
test.after(() => rmSync(home, { recursive: true, force: true }));

// ── Invariant 1: the surface is exactly ./skills ────────────────────────────

test("no tool is named pix_pix*", () => {
  const rule = surface.tools.filter((name) => name.startsWith("rule_tool_pix"));
  assert.deepEqual(rule, [], "stale brand tools must not exist and must not be callable");
});

test("rule_tool_frontend_react exists and is served by this server", () => {
  assert.ok(surface.tools.includes("rule_tool_frontend_react"));
});

test("every tool traces back to a rule-* directory in ./skills", () => {
  const dirs = new Set(embeddedSkillDirs);
  // Action tools are registered by code, not by a skill directory.
  const ACTION = new Set([
    "pix_tool",
    "rule_tool_apply",
    "rule_tool_check",
    "rule_tool_component",
    "rule_tool_compress",
    "rule_tool_detect",
    "rule_tool_fix",
    "rule_tool_gateway",
    "rule_tool_scaffold",
    "rule_tool_search",
    "rule_tool_update",
  ]);
  for (const name of surface.tools) {
    if (ACTION.has(name)) {
      continue;
    }
    const dir = `rule-${name.replace(/^rule_tool_/, "").replaceAll("_", "-")}`;
    assert.ok(dirs.has(dir), `${name} has no backing directory in ./skills (expected ${dir})`);
  }
});

test("every skill the registry reports starts with rule-", () => {
  const foreign = surface.skills.filter((name) => !name.startsWith("rule-"));
  assert.deepEqual(foreign, [], "a foreign skill name would mint a foreign pix_* tool");
});

// ── Invariant 2: the home directory cannot influence the surface ────────────

test("a stale brand directory in ~/.agents/skills adds no tool", () => {
  assert.ok(!surface.skills.includes("rule-frontend-react"));
  assert.ok(!surface.tools.includes("pix_pix_frontend_react"));
});

test("a generic third-party skill in ~/.agents/skills adds no tool", () => {
  assert.ok(!surface.tools.includes("pix_test_driven_development"));
  assert.ok(!surface.tools.includes("pix_evil_plugin"));
});

test("a home copy cannot shadow the content of an embedded skill", async () => {
  const script = `
    const { readSkill } = await import(${JSON.stringify(new URL("../src/tools/router.js", import.meta.url).href)});
    process.stdout.write(readSkill("rule-frontend-react") ?? "");
  `;
  const content = execFileSync(process.execPath, ["--input-type=module", "--eval", script], {
    cwd: new URL("..", import.meta.url).pathname,
    env: { ...process.env, HOME: home, USERPROFILE: home },
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  assert.doesNotMatch(content, /SHADOWED/, "embedded skill content is authoritative");
  assert.ok(content.length > 100, "the embedded skill must still be readable");
});

test("the surface size matches the embedded skill count", () => {
  // All directories minus the bare `rule` router skill which is registered as
  // the dispatcher tool rather than a skill tool.
  const expectedSkills = embeddedSkillDirs.filter((d) => d.startsWith("rule-")).length;
  assert.equal(surface.skills.length, expectedSkills);
  assert.ok(surface.bytes < 130_000, `tool schemas grew to ${surface.bytes} bytes - the surface is leaking again`);
});
