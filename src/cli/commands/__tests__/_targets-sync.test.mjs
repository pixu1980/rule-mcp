

/** syncCommandTargets: missing dirs, stale sweeps, and the dry-run prefix. */
import { strict as assert } from "node:assert";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { syncCommandTargets } from "../_targets-sync.js";

const home = mkdtempSync(join(tmpdir(), "rule-targets-sync-"));
const savedHome = process.env.HOME;

test.before(() => {
  process.env.HOME = home;
  delete process.env.PI_CODING_AGENT_DIR;
});

test.after(() => {
  if (savedHome === undefined) {
    delete process.env.HOME;
  } else {
    process.env.HOME = savedHome;
  }

  rmSync(home, { recursive: true, force: true });
});

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

test("removing from a missing command directory reports and skips it", () => {
  const text = out(() => syncCommandTargets({ agent: "pi", remove: true, dryRun: true }));

  assert.match(text, /no command directory/, "the missing dir is named, not crashed on");
  assert.match(text, /removed 0 file/, "nothing is removed");
});

test("the sweep removes stale rule files of every ending and nothing else", () => {
  const dir = join(home, ".pi", "agent", "prompts");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "rule-old.md"), "stale");
  writeFileSync(join(dir, "rule-old.toml"), "stale");
  writeFileSync(join(dir, "rule-note.txt"), "not a command ending");
  writeFileSync(join(dir, "keep.md"), "not a rule file");

  const text = out(() => syncCommandTargets({ agent: "pi", remove: true, dryRun: false }));

  assert.match(text, /removed 2 rule\* command file/, "the md and the toml go");
  assert.doesNotMatch(text, /\[dry-run\]/, "a real run carries no dry-run prefix");
  assert.equal(existsSync(join(dir, "rule-old.md")), false, "the stale md is gone");
  assert.equal(existsSync(join(dir, "rule-old.toml")), false, "the stale toml is gone");
  assert.ok(existsSync(join(dir, "rule-note.txt")), "a rule file with another ending survives");
  assert.ok(existsSync(join(dir, "keep.md")), "a non-rule file survives");

  const dry = out(() => syncCommandTargets({ agent: "pi", remove: true, dryRun: true }));

  assert.match(dry, /\[dry-run\] .*removed 0/, "a dry run prefixes and removes nothing");
  assert.deepEqual(readdirSync(dir).sort(), ["keep.md", "rule-note.txt"], "the survivors stay");
});
