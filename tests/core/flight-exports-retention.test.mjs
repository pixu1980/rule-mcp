/**
 * Hardening 2.2 (F-P1): exports/ has a retention policy of its own.
 *
 * Raw events are purged after 7 days, but an exported .flight carries the
 * whole recording - prompts included - and used to live forever. The cap is
 * deliberately generous (keep the newest N or anything inside the age window,
 * whichever is larger) and never removes the newest file: a retention rule
 * that eats the export somebody just made is a bug, not a policy.
 */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { pruneExports } from "../../src/core/telemetry-flight.js";

const DAY_MS = 86_400_000;

function seedExports(spec) {
  const dir = mkdtempSync(join(tmpdir(), "rule-exports-"));
  mkdirSync(dir, { recursive: true });
  for (const [name, ageDays] of Object.entries(spec)) {
    const file = join(dir, name);
    writeFileSync(file, "{}");
    const when = (Date.now() - ageDays * DAY_MS) / 1000;
    utimesSync(file, when, when);
  }
  return dir;
}

test("beyond-cap exports go oldest first", () => {
  const dir = seedExports({ "a.flight": 400, "b.flight": 300, "c.flight": 200, "d.flight": 1 });
  try {
    const result = pruneExports({ dir, keep: 2, maxAgeDays: 90 });
    const left = readdirSync(dir).sort();
    assert.deepEqual(left, ["c.flight", "d.flight"], "the two newest survive");
    assert.equal(result.removed, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("recent exports survive even beyond the count cap", () => {
  const dir = seedExports({ "a.flight": 3, "b.flight": 2, "c.flight": 1 });
  try {
    const result = pruneExports({ dir, keep: 1, maxAgeDays: 90 });
    assert.equal(result.removed, 0, "inside the age window nothing is removed");
    assert.equal(readdirSync(dir).length, 3);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the newest export is never removed", () => {
  const dir = seedExports({ "old.flight": 5000 });
  try {
    const result = pruneExports({ dir, keep: 0, maxAgeDays: 1 });
    assert.equal(result.removed, 0, "the only export is the newest one");
    assert.deepEqual(readdirSync(dir), ["old.flight"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("non-flight files are left alone", () => {
  const dir = seedExports({ "a.flight": 900, "b.flight": 800, "notes.md": 900 });
  try {
    pruneExports({ dir, keep: 1, maxAgeDays: 30 });
    assert.ok(readdirSync(dir).includes("notes.md"), "retention owns .flight files, nothing else");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
