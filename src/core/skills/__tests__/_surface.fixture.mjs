

// test/skill-surface-embedded-only fixture
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

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Server code resolves `@src/*` through a hook (ADR 089); a spawned
// process loads it too, so it registers the hook as every entry point does.
const ALIAS_HOOK = fileURLToPath(new URL("../../../../scripts/alias-hook.mjs", import.meta.url));

/**
 * Load the server in a child process with HOME pointed at `home`, and return the
 * resulting tool names plus the skill names the registry saw.
 */
export function surfaceWith(home) {
  const script = `
    const { loadAllSkills } = await import(${JSON.stringify(new URL("../index.js", import.meta.url).href)});
    await loadAllSkills();
    const { listTools, getSkillNames } = await import(${JSON.stringify(new URL("../../../tools/router/index.js", import.meta.url).href)});
    process.stdout.write(JSON.stringify({
      tools: listTools().map((t) => t.name),
      skills: getSkillNames(),
      bytes: JSON.stringify(listTools()).length,
    }));
  `;
  const out = execFileSync(process.execPath, ["--import", ALIAS_HOOK, "--input-type=module", "--eval", script], {
    cwd: new URL("../../..", import.meta.url).pathname,
    env: { ...process.env, HOME: home, USERPROFILE: home, RULE_MCP_NO_AUTOUPDATE: "1" },
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  return JSON.parse(out);
}

/** A home directory carrying skills that must NOT reach the tool surface. */
export function makeHostileHome() {
  const home = mkdtempSync(join(tmpdir(), "rule-home-"));
  const skills = join(home, ".agents", "skills");
  // A stale skill from a previous brand - a rule-* name not in the embedded
  // corpus must NOT become a pix_* tool because rule only scans rule-* from
  // the embedded ./skills tree.
  mkdirSync(join(skills, "rule-outdated-brand"), { recursive: true });
  writeFileSync(join(skills, "rule-outdated-brand", "SKILL.md"), "---\nname: rule-outdated-brand\n---\nstale\n");
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

export const embeddedSkillDirs = readdirSync(new URL("../../../../skills", import.meta.url).pathname, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

export const home = makeHostileHome();
export const surface = surfaceWith(home);

/** Run a one-line module script in a child with the hostile HOME. */
export function runWithHome(script) {
  return execFileSync(process.execPath, ["--import", ALIAS_HOOK, "--input-type=module", "--eval", script], {
    cwd: new URL("../../..", import.meta.url).pathname,
    env: { ...process.env, HOME: home, USERPROFILE: home },
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
}
