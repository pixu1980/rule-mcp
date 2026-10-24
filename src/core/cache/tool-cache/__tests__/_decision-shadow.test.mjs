/** The shadow report: false-replay accounting, a threshold sweep and the JSONL record. */
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const stateDir = mkdtempSync(join(tmpdir(), "rule-mcp-decision-shadow-report-"));

process.env.RULE_MCP_STATE_DIR = stateDir;
process.env.RULE_MCP_DECISION_CACHE_SHADOW = "1";
process.env.RULE_MCP_DECISION_MODEL = "laya";
delete process.env.RULE_MCP_NO_CACHE;

const { cacheClear } = await import("../index.js");
const { observeDecisionShadow, waitForDecisionShadows } = await import("../_decision-gate.js");
const { clearShadows, readShadows, recordShadow, summarizeShadows } = await import("../_decision-shadow.js");

test.after(() => {
  rmSync(stateDir, { recursive: true, force: true });
  delete process.env.RULE_MCP_STATE_DIR;
  delete process.env.RULE_MCP_DECISION_CACHE_SHADOW;
  delete process.env.RULE_MCP_DECISION_MODEL;
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

test("guarded events never count toward the floor", () => {
  const events = [
    event({ probability: 0.99, correct: false, guard: "ambiguous-hub", wouldReplay: false, reason: "ambiguous-hub" }),
    event({ probability: 0.95, correct: true, guard: null }),
    event({ probability: 0.9, correct: true, guard: null }),
  ];
  const summary = summarizeShadows(events, { minPredictions: 2 });
  const withoutGuard = summarizeShadows(
    events.map(({ guard, ...rest }) => rest),
    { minPredictions: 2 },
  );

  assert.equal(summary.guarded, 1);
  assert.equal(summary.eligible, 2);
  assert.equal(summary.recommended.threshold, 0.3);
  assert.equal(summary.recommended.predicted, 2);
  assert.equal(summary.recommended.wrong, 0);
  assert.equal(withoutGuard.recommended, null, "without the guard the 0.99 wrong blocks every floor");
});

test("the record round-trips through the JSONL file and clears", () => {
  clearShadows();
  recordShadow({ tool: "rule_tool", correct: true });
  recordShadow({ tool: "rule_tool", correct: false });

  assert.equal(readShadows().length, 2);

  clearShadows();

  assert.deepEqual(readShadows(), []);
});

test("a no-candidates record still carries the gold route and no prediction", async () => {
  cacheClear();
  clearShadows();
  const core = { content: [{ type: "text", text: JSON.stringify({ route: "rule-mcp-frontend-react" }) }] };

  await observeDecisionShadow("rule_tool", { prompt: "a prompt that matches no cached call", framework: "react" }, { core, computeMs: 2 });
  await waitForDecisionShadows();
  const last = readShadows().at(-1);

  assert.equal(last.reason, "no-candidates");
  assert.equal(last.goldRoute, "rule-mcp-frontend-react");
  assert.equal(last.candidateRoute, null);
  assert.equal(last.correct, null);
  assert.equal(last.wouldReplay, false);
});
