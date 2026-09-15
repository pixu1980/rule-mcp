

/** The optional tasks answer without side effects: dry runs and skips. */
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { dockerTask, doctorTask, rulesTask, serviceTask, skillsTask } from "../_task-extras.js";

test("dry runs describe instead of doing", async () => {
  assert.deepEqual(await doctorTask().run({ dryRun: true }), { status: "ok", summary: "would run rule-mcp doctor" });
  assert.deepEqual(await skillsTask().run({ dryRun: true }), { status: "ok", summary: "would install to ~/.agents/skills" });

  const rules = rulesTask().run({ dryRun: true });
  assert.equal(rules.status, "ok", "the instruction files dry-run answers ok");
  assert.match(rules.summary, /file\(s\)/, "the dry run counts the files it would touch");
});

test("the docker task reports blocked or ok, never throws", () => {
  const result = dockerTask().run({ dryRun: true });

  assert.ok(["warn", "ok"].includes(result.status), "a missing docker warns, a present one plans");
  assert.ok(result.summary.length > 0, "the summary names the outcome");
});

test("the service task names its platform service in dry run", () => {
  const result = serviceTask().run({ dryRun: true });

  assert.equal(result.status, "ok", "a dry-run install answers ok");
  assert.match(result.summary, /on (macos|linux|windows|unknown)/, "the summary names the platform");
});
