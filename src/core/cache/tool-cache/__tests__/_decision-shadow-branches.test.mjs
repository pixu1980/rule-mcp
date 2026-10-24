

/** Branch coverage for shadow IO catch arms and summarizeShadows edge rows. */
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const stateDir = mkdtempSync(join(tmpdir(), "rule-mcp-decision-shadow-branches-"));

process.env.RULE_MCP_STATE_DIR = stateDir;
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
delete process.env.RULE_MCP_NO_CACHE;

const { clearShadows, readShadows, recordShadow, shadowFile, summarizeShadows } = await import("../_decision-shadow.js");

test.after(() => {
  rmSync(stateDir, { recursive: true, force: true });
  delete process.env.RULE_MCP_STATE_DIR;
});

function event(overrides) {
  return {
    choice: "candidate-1",
    probability: 0.95,
    correct: true,
    wouldReplay: true,
    decisionCacheHit: false,
    reason: "candidate",
    model: "laya",
    ms: 70,
    goldMs: 4,
    ...overrides,
  };
}

test("readShadows returns [] when the file is missing", () => {
  clearShadows();
  assert.deepEqual(readShadows(), []);
});

test("readShadows swallows malformed JSONL", () => {
  clearShadows();
  writeFileSync(shadowFile(), "{not-json\n");
  assert.deepEqual(readShadows(), []);
});

test("recordShadow swallows an unwritable state directory", { skip: process.platform === "win32" }, () => {
  const blocked = mkdtempSync(join(tmpdir(), "rule-mcp-shadow-blocked-"));
  const asFile = join(blocked, "not-a-dir");

  writeFileSync(asFile, "x");
  process.env.RULE_MCP_STATE_DIR = asFile;

  try {
    assert.doesNotThrow(() => recordShadow({ tool: "rule_tool" }));
  } finally {
    process.env.RULE_MCP_STATE_DIR = stateDir;
    rmSync(blocked, { recursive: true, force: true });
  }
});

test("clearShadows swallows a path that cannot be removed as a file", { skip: process.platform === "win32" }, () => {
  clearShadows();
  const file = shadowFile();

  rmSync(file, { force: true });
  mkdirSync(file, { recursive: true });
  writeFileSync(join(file, "child"), "x");

  try {
    assert.doesNotThrow(() => clearShadows());
  } finally {
    chmodSync(file, 0o755);
    rmSync(file, { recursive: true, force: true });
  }
});

test("summarizeShadows covers none/guard/wrong rows, null precision and empty means", () => {
  const events = [
    event({ choice: "none", probability: 0.4, correct: null, wouldReplay: false, reason: "none", model: null, ms: undefined, goldMs: undefined }),
    event({ probability: 0.99, correct: false, guard: "ambiguous-hub", wouldReplay: false, reason: "ambiguous-hub" }),
    event({ probability: 0.4, correct: true, wouldReplay: false, reason: "below-threshold" }),
    event({ probability: 0.92, correct: false, wouldReplay: true }),
    // No model/ms: meanMs and meanGoldMs take the empty-values arm.
    { choice: "candidate-2", probability: 0.5, correct: true, wouldReplay: false, reason: "candidate" },
  ];
  const summary = summarizeShadows(events, { minPredictions: 100 });

  assert.equal(summary.total, 5);
  assert.equal(summary.guarded, 1);
  assert.equal(summary.reasons.none, 1);
  assert.equal(summary.meanMs, 70, "only the one modeled event contributes");
  assert.equal(summary.meanGoldMs, 4);
  assert.equal(summary.recommended, null, "the floor never clears with minPredictions 100");

  const emptyMeans = summarizeShadows([{ choice: "none", reason: "none", wouldReplay: false }], { minPredictions: 1 });

  assert.equal(emptyMeans.meanMs, 0);
  assert.equal(emptyMeans.meanGoldMs, 0);
  assert.ok(
    emptyMeans.thresholds.some((row) => row.precision === null && row.predicted === 0),
    "high thresholds with no predictions keep precision null",
  );
});
