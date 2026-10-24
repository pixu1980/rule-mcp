

/** Handoff formatting helpers and the export-retention policy. */
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync, writeFileSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { compressValue, estimateTokens, priorityScore } from "../_format.js";
import { pruneExports } from "../../../core/telemetry/flight/_retention.js";

test("compressValue shortens, passes through and normalizes the dash", () => {
  assert.equal(compressValue(), "-", "an absent value renders a dash");
  assert.equal(compressValue("-"), "-", "a dash stays a dash");
  assert.equal(compressValue("short"), "short", "short values pass through");
  assert.equal(compressValue(42), "42", "numbers stringify");
  assert.equal(compressValue("x".repeat(100), 10), "x".repeat(7) + "...", "long values truncate");
});

test("estimateTokens weighs whitespace-separated tokens", () => {
  assert.ok(estimateTokens("a b c") > 0, "a short string estimates above zero");
  assert.equal(estimateTokens(""), 1, "an empty string still estimates one split token");
  assert.ok(estimateTokens("word ".repeat(20)) > estimateTokens("word"), "more tokens estimates more");
});

test("priorityScore buckets the context keys by importance", () => {
  assert.ok(priorityScore("ADR_DECISION") >= 100, "decision keys top the order");
  assert.ok(priorityScore("STACK") >= 80, "stack keys are high");
  assert.ok(priorityScore("ENTITY") >= 60, "entity keys are mid");
  assert.ok(priorityScore("TYPESCRIPT") >= 40, "typescript keys rank below");
  assert.ok(priorityScore("DESCRIPTION") >= 50, "description ranks above notes");
  assert.ok(priorityScore("NOTES") >= 30, "notes rank above default");
  assert.equal(priorityScore("random_thing"), 10, "everything else defaults low");
});

test("pruneExports removes old exports beyond the keep floor", () => {
  const dir = mkdtempSync(join(tmpdir(), "rule-mcp-flight-"));
  const NOW = 1_760_000_000_000;
  const DAY = 86_400_000;
  for (let index = 0; index < 4; index++) {
    const file = join(dir, `export-${index}.flight`);
    writeFileSync(file, "{}");
    utimesSync(file, new Date(NOW - (120 - index * 10) * DAY), new Date(NOW - (120 - index * 10) * DAY));
  }

  const { removed, kept } = pruneExports({ dir, now: NOW, keep: 2, maxAgeDays: 90 });
  assert.equal(kept, 2, "kept counts the files that remain");
  assert.equal(removed, 2, "the two oldest beyond the caps are removed");

  rmSync(dir, { recursive: true, force: true });
});

test("pruneExports keeps the newest file and tolerates empty or missing dirs", () => {
  const dir = mkdtempSync(join(tmpdir(), "rule-mcp-flight-"));
  const NOW = 1_760_000_000_000;
  const DAY = 86_400_000;
  for (let index = 0; index < 3; index++) {
    const file = join(dir, `e-${index}.flight`);
    writeFileSync(file, "{}");
    utimesSync(file, new Date(NOW - 200 * DAY), new Date(NOW - 200 * DAY));
  }

  const { removed, kept } = pruneExports({ dir, now: NOW, keep: 1, maxAgeDays: 90 });
  assert.equal(removed, 2, "the newest is never removed");
  assert.equal(kept, 1, "the newest survives");

  assert.deepEqual(pruneExports({ dir: join(dir, "missing") }), { dir: join(dir, "missing"), removed: 0, kept: 0 }, "a missing dir is a no-op");
  rmSync(dir, { recursive: true, force: true });
});
