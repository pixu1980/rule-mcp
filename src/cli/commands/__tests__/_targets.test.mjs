/** agent-commands targets: write/skip/remove cycles and target printing. */
import { strict as assert } from "node:assert";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { agentCommandsCommand, printCommandTargets } from "../_targets.js";

const dir = mkdtempSync(join(tmpdir(), "rule-targets-"));

test.after(() => rmSync(dir, { recursive: true, force: true }));

const out = (fn) => {
  const chunks = [];
  const write = process.stdout.write;
  process.stdout.write = (chunk) => {
    chunks.push(String(chunk));
    return true;
  };
  try {
    fn();
  } finally {
    process.stdout.write = write;
  }
  return chunks.join("");
};

test("agentCommandsCommand writes files and skips existing ones without force", () => {
  const text = out(() => agentCommandsCommand({ dir, format: "args", dryRun: true }));
  assert.match(text, /wrote \d+, skipped 0/, "a dry run still reports the counts");
  assert.equal(readdirSync(dir).length, 0, "a dry run writes nothing");

  out(() => agentCommandsCommand({ dir, format: "args" }));
  const firstCount = readdirSync(dir).length;
  assert.ok(firstCount > 0, "a real run writes the command files");

  const second = out(() => agentCommandsCommand({ dir, format: "args" }));
  assert.match(second, /skipped \d+/, "existing files are skipped without force");

  const forced = out(() => agentCommandsCommand({ dir, format: "args", force: true }));
  assert.match(forced, /wrote \d+, skipped 0/, "force rewrites everything");
});

test("agentCommandsCommand removes the files and validates its options", () => {
  out(() => agentCommandsCommand({ dir, format: "args" }));
  const removed = out(() => agentCommandsCommand({ dir, format: "args", remove: true }));
  assert.match(removed, /removed \d+ file/, "the remove reports the count");
  assert.equal(readdirSync(dir).length, 0, "the files are gone");

  assert.throws(() => agentCommandsCommand({ dir, format: "nope" }), /Unknown --format/, "a bad format throws");
  assert.throws(() => agentCommandsCommand({}), /requires --dir/, "a missing dir throws");
});

test("printCommandTargets renders tables and json", () => {
  const listed = out(() => printCommandTargets({}));
  assert.ok(listed.includes("agent	") || listed.includes("\t"), "the tab table renders");

  const json = out(() => printCommandTargets({ json: true }));
  assert.match(json, /^\[/, "the json output opens an array");
});
