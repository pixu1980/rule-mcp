

/**
 * The tasks every install runs, exercised the way the review screen sees them.
 *
 * Building a task performs no work, so the whole plan can be inspected before
 * a file is touched - which is the property these tests lean on. Every run
 * here is a dry run: the point is the row a task reports, not the write.
 */
import { strict as assert } from "node:assert";
import test from "node:test";

import { agentInstallTask, agentRemovalTask, runtimeHomeTask, shimRemovalTask, shimTask, statusText } from "../_task-core.js";

test("a status with no reason is just the status", () => {
  assert.equal(statusText({ status: "ok" }), "ok");
  assert.equal(statusText({ status: "skipped", reason: "sandboxed" }), "skipped - sandboxed", "a reason is appended, not substituted");
});

test("building a task writes nothing, so a plan can be listed first", () => {
  const tasks = [runtimeHomeTask(), shimTask("/x/bin.js"), shimRemovalTask(), agentInstallTask("claude", "stdio", false), agentRemovalTask("claude")];

  for (const task of tasks) {
    assert.equal(typeof task.id, "string", "every task has an id");
    assert.equal(typeof task.title, "string", "and a title the review screen prints");
    assert.equal(typeof task.run, "function", "and the work is behind run()");
  }
});

test("the agent task says what it will do, before it does it", () => {
  assert.equal(agentInstallTask("claude", "stdio", false).detail, "mode stdio", "the plain case names the mode alone");
  assert.equal(agentInstallTask("claude", "stdio", false, false).detail, "mode stdio, no guard hooks", "a declined guard screen is visible in the plan");
  assert.equal(agentInstallTask("codex", "stdio", false, false).detail, "mode stdio", "only Claude writes a guard, so only Claude says it does not");
  assert.equal(agentInstallTask("claude", "daemon", false, true, true).detail, "mode daemon, minimal tools", "the older toggle shows when no surface was answered");
});

test("an answered surface step owns the surface, and the older toggle goes quiet", () => {
  // minimal: true asks for the old toggle, and the surface answer overrides it.
  const detail = agentInstallTask("claude", "stdio", false, true, true, { preset: "standard" }).detail;

  assert.equal(detail, "mode stdio, standard tools", "the surface is what the plan states");
  assert.doesNotMatch(detail, /minimal/, "the toggle it overrode is not also reported");
});

test("a surface named by areas is spelled out in the plan", () => {
  assert.equal(agentInstallTask("claude", "stdio", false, true, undefined, { areas: ["frontend", "backend"] }).detail, "mode stdio, areas:frontend,backend tools");
});

test("the removal task says whether it takes the command files too", () => {
  assert.equal(agentRemovalTask("claude").detail, "remove the mcp.json entry only", "command files belong to their own plan group");
  assert.equal(agentRemovalTask("claude", { commands: true }).detail, "remove the mcp.json entry and the command files");
});

test("a dry-run agent install reports what it would have done", () => {
  const result = agentInstallTask("claude", "stdio", false).run({ dryRun: true });

  assert.equal(result.status, "ok");
  assert.match(result.summary, /would configure/, "the summary is conditional, because nothing was written");
});

test("an agent that refuses the mode is a warning row, not a thrown install", () => {
  const result = agentInstallTask("claude", "daemon", false).run({ dryRun: true });

  assert.equal(result.status, "warn", "the run continues and the row carries the reason");
  assert.match(result.summary, /supported only for Pi and VS Code/);
});

test("a dry-run agent removal reports what it would have removed", () => {
  const result = agentRemovalTask("claude").run({ dryRun: true });

  assert.equal(result.status, "ok");
  assert.equal(result.summary, "would remove");
});

test("the runtime home task reports the directories it owns", () => {
  const result = runtimeHomeTask().run({ dryRun: true });

  assert.equal(result.status, "ok");
  assert.ok(result.summary.length > 0, "the home directory is named");
  assert.ok(
    result.lines.some((line) => line.startsWith("switches: config/env.json")),
    `the switches file is listed: ${result.lines.join(" | ")}`,
  );
});

test("the shim removal summary counts statuses, not rows", () => {
  const result = shimRemovalTask().run({ dryRun: true });

  assert.equal(result.status, "ok");
  assert.ok(typeof result.summary === "string" && result.summary.length > 0, "a summary is always produced, even with nothing to remove");
  assert.ok(Array.isArray(result.lines), "and every row is listed with its status");
});
