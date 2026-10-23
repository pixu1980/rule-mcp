

/** The shadow report: false-replay accounting, a threshold sweep and the JSONL record. */
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const stateDir = mkdtempSync(join(tmpdir(), "rule-decision-shadow-report-"));

process.env.RULE_MCP_STATE_DIR = stateDir;

const { clearShadows, readShadows, recordShadow, summarizeShadows } = await import("../_decision-shadow.js");

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

test("the summary counts false replays and recommends the lowest safe threshold", () => {
  const events = [
    event({ probability: 0.96, correct: true }),
    event({ probability: 0.92, correct: false }),
    event({ choice: "none", probability: 0.4, correct: null, wouldReplay: false, decisionCacheHit: true, reason: "none" }),
    event({ probability: 0.7, correct: true, wouldReplay: false, reason: "below-threshold" }),
    event({ probability: 0.99, correct: null }),
  ];
  const summary = summarizeShadows(events, { minPredictions: 1 });

  assert.equal(summary.total, 5);
  assert.equal(summary.wouldReplay, 3);
  assert.equal(summary.currentWrong, 1);
  assert.equal(summary.labeled, 3);
  assert.equal(summary.unlabeled, 1);
  assert.equal(summary.cacheHits, 1);
  assert.equal(summary.recommended.threshold, 0.95);
  assert.equal(summary.recommended.wrong, 0);
  assert.equal(summary.meanGoldMs, 4);
});

test("the record round-trips through the JSONL file and clears", () => {
  clearShadows();
  recordShadow({ tool: "pix_tool", correct: true });
  recordShadow({ tool: "pix_tool", correct: false });

  assert.equal(readShadows().length, 2);

  clearShadows();

  assert.deepEqual(readShadows(), []);
});
