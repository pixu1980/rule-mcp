

/** Branch coverage for the install tasks' run arms. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { agentInstallTask, agentRemovalTask, shimRemovalTask, shimTask } from "../_task-core.js";
import { commandsTask } from "../_task-extras.js";

test("the shim task reports its dry-run row", () => {
  const result = shimTask("/x/bin.js").run({ dryRun: true });

  assert.ok(["ok", "warn"].includes(result.status));
  assert.match(result.summary, /planned|path|bin/u);
});

test("the shim removal task summarizes what it counted", () => {
  const result = shimRemovalTask().run({ dryRun: true });

  assert.equal(result.status, "ok");
  assert.equal(typeof result.summary, "string");
  assert.ok(Array.isArray(result.lines));
});

test("an agent that refuses the mode is a warning, not a throw", () => {
  const result = agentInstallTask("claude", "daemon", false).run({ dryRun: true });

  assert.equal(result.status, "warn");
  assert.ok(result.summary.length > 0);
});

test("a known agent removal says it would remove on a dry run", () => {
  const result = agentRemovalTask("claude").run({ dryRun: true });

  assert.equal(result.status, "ok");
  assert.equal(result.summary, "would remove");
});

test("the commands task reports its dry-run run", async () => {
  const result = await commandsTask(false, [], null).run({ dryRun: true });

  assert.ok(["ok", "warn"].includes(result.status));
  assert.ok(result.summary.length > 0);
});
