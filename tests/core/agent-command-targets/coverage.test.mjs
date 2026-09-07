/** Coverage and target resolution: every agent covered or excluded, dirs resolve per host. */
import { strict as assert } from "node:assert";
import { join } from "node:path";
import { test } from "node:test";

import {
  AGENTS_WITHOUT_COMMAND_SURFACE,
  COMMAND_TARGETS,
  FORMAT_EXT,
  agentsWithCleanCommands,
  ctx,
  getAllAgents,
  resolveCommandTargets,
} from "./_targets.fixture.mjs";

console.log("agent command targets test: coverage and resolution");

test("coverage: every supported agent is either covered or explicitly excluded", () => {
  const covered = new Set(agentsWithCleanCommands());
  const uncovered = [];
  for (const agent of getAllAgents()) {
    if (covered.has(agent)) {
      continue;
    }
    const reason = AGENTS_WITHOUT_COMMAND_SURFACE[agent];
    if (!reason || reason.trim().length === 0) {
      uncovered.push(agent);
    }
  }
  assert.deepEqual(
    uncovered,
    [],
    `agents with neither a command target nor a documented reason: ${uncovered.join(", ")}`,
  );
});

test("exclusions name real agents only, and never contradict a target", () => {
  const all = new Set(getAllAgents());
  const covered = new Set(agentsWithCleanCommands());
  for (const [agent, reason] of Object.entries(AGENTS_WITHOUT_COMMAND_SURFACE)) {
    assert.ok(all.has(agent), `${agent} is excluded but is not a supported agent`);
    assert.ok(!covered.has(agent), `${agent} is both excluded and has a command target`);
    assert.ok(reason.length > 20, `${agent}: the exclusion reason must explain the gap`);
  }
});

test("every target declares a known render format and scope", () => {
  for (const target of COMMAND_TARGETS) {
    assert.ok(FORMAT_EXT[target.format], `${target.agent}: unknown format ${target.format}`);
    assert.ok(["global", "project"].includes(target.scope), `${target.agent}: bad scope ${target.scope}`);
    assert.ok(target.label && target.label.length > 0, `${target.agent}: label required`);
    assert.equal(typeof target.dirs, "function", `${target.agent}: dirs must be a resolver`);
  }
});

test("VS Code: prompt files land in the user-profile prompts dirs of every installed variant", () => {
  const support = join("/home/u", "Library", "Application Support");
  const codeUser = join(support, "Code", "User");
  const insidersUser = join(support, "Code - Insiders", "User");
  const targets = resolveCommandTargets({
    agent: "vscode",
    ...ctx({
      present: [insidersUser, join(insidersUser, "profiles")],
      profiles: { [join(insidersUser, "profiles")]: ["-abc123"] },
    }),
  });
  const dirs = targets.map((t) => t.dir);

  assert.ok(dirs.includes(join(codeUser, "prompts")), "stable VS Code user prompts dir is always targeted");
  assert.ok(dirs.includes(join(insidersUser, "prompts")), "installed Insiders variant is targeted");
  assert.ok(
    dirs.includes(join(insidersUser, "profiles", "-abc123", "prompts")),
    "per-profile prompts dirs are targeted (prompt files are profile-scoped)",
  );
  assert.ok(
    dirs.every((dir) => !dir.includes("Code - OSS")),
    "variants that are not installed must not be created",
  );
  for (const target of targets) {
    assert.equal(target.format, "prompt", "VS Code uses the .prompt.md format");
  }
});

test("VS Code: the committed .github/prompts dir is never written to automatically", () => {
  // User-level prompt files already cover every workspace; .github/prompts is
  // team-shared and committed, so an install must not drop 24 files in git status.
  for (const context of [ctx(), ctx({ present: [join("/repo", ".github")] })]) {
    const dirs = resolveCommandTargets({ agent: "vscode", ...context }).map((t) => t.dir);
    assert.ok(
      dirs.every((dir) => !dir.includes(".github")),
      "no automatic writes into .github",
    );
  }
});

test("Claude and Pi keep their existing bare-command dirs", () => {
  const claude = resolveCommandTargets({ agent: "claude", ...ctx() }).map((t) => t.dir);
  assert.ok(claude.includes(join("/home/u", ".claude", "commands")), "Claude user commands dir");

  const pi = resolveCommandTargets({ agent: "pi", ...ctx() }).map((t) => t.dir);
  assert.ok(pi.includes(join("/home/u", ".pi", "agent", "prompts")), "Pi prompt templates dir");

  const piOverride = resolveCommandTargets({
    agent: "pi",
    ...ctx({ env: { PI_CODING_AGENT_DIR: "/custom/pi" } }),
  }).map((t) => t.dir);
  assert.ok(piOverride.includes(join("/custom/pi", "prompts")), "PI_CODING_AGENT_DIR wins");
});

test("detectedOnly resolves nothing for agents that are not installed", () => {
  const none = resolveCommandTargets({ detectedOnly: true, ...ctx() });
  assert.deepEqual(none, [], "an empty machine has no command targets");

  const claudeOnly = resolveCommandTargets({
    detectedOnly: true,
    ...ctx({ present: [join("/home/u", ".claude")] }),
  });
  assert.deepEqual([...new Set(claudeOnly.map((t) => t.agent))], ["claude"], "only the detected agent is targeted");
});
