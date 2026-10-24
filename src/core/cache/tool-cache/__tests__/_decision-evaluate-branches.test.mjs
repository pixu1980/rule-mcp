/** Branch coverage for evaluateDecision miss arms and the model-error catch. */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const stateDir = mkdtempSync(join(tmpdir(), "rule-mcp-decision-evaluate-branches-"));

process.env.RULE_MCP_STATE_DIR = stateDir;
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
process.env.RULE_MCP_NO_TELEMETRY = "1";
delete process.env.RULE_MCP_NO_CACHE;
delete process.env.RULE_MCP_DECISION_CACHE_REPLAY;
delete process.env.RULE_MCP_DECISION_CACHE_SHADOW;

const { cacheClear, cacheStore } = await import("../index.js");
const { evaluateDecision } = await import("../_decision-evaluate.js");
const { clearDecisionCache } = await import("../../../decision/_cache.js");
const { resetDecisionRuntime } = await import("../../../decision/_runtime.js");

test.after(() => {
  rmSync(stateDir, { recursive: true, force: true });
  delete process.env.RULE_MCP_STATE_DIR;
  delete process.env.RULE_MCP_DECISION_MODEL;
  delete process.env.RULE_MCP_DECISION_URL;
  delete process.env.RULE_MCP_NO_CACHE;
});

function seedCandidate() {
  cacheClear();
  clearDecisionCache();
  resetDecisionRuntime();
  cacheStore(
    "rule_tool",
    { prompt: "create a react button component", framework: "react" },
    { content: [{ type: "text", text: JSON.stringify({ route: "rule-mcp-frontend-react" }) }] },
    {},
  );
}

test("cache disabled returns null before any gate work", async () => {
  process.env.RULE_MCP_NO_CACHE = "1";

  try {
    assert.equal(await evaluateDecision("rule_tool", { prompt: "create a react form" }), null);
  } finally {
    delete process.env.RULE_MCP_NO_CACHE;
  }
});

test("a tool call without a prompt field is a miss", async () => {
  assert.equal(await evaluateDecision("rule_tool", { framework: "react" }), null);
  assert.equal(await evaluateDecision("rule_tool", { prompt: " ".repeat(3) }), null);
});

test("an empty candidate set returns no-candidates", async () => {
  cacheClear();
  clearDecisionCache();
  process.env.RULE_MCP_DECISION_MODEL = "laya";

  const evaluated = await evaluateDecision("rule_tool", { prompt: "nothing matches this prompt", framework: "react" });

  assert.equal(evaluated.reason, "no-candidates");
  assert.equal(evaluated.candidates.length, 0);
  assert.ok(evaluated.prompt);
});

test("a configured gate with no model returns no-model", async () => {
  seedCandidate();
  delete process.env.RULE_MCP_DECISION_MODEL;

  const evaluated = await evaluateDecision("rule_tool", { prompt: "create a react form component", framework: "react" });

  assert.equal(evaluated.reason, "no-model");
  assert.ok(evaluated.candidates.length > 0);
});

test("a model that refuses the socket returns model-error", async () => {
  seedCandidate();
  process.env.RULE_MCP_DECISION_MODEL = "laya";
  // Port 1 is almost never listening; the client fails the ask and the gate catches it.
  process.env.RULE_MCP_DECISION_URL = "http://127.0.0.1:1";
  process.env.RULE_MCP_DECISION_TIMEOUT = "200";

  try {
    const evaluated = await evaluateDecision("rule_tool", { prompt: "create a react form component", framework: "react" });

    assert.equal(evaluated.reason, "model-error");
    assert.ok(evaluated.model);
    assert.ok(evaluated.candidates.length > 0);
  } finally {
    delete process.env.RULE_MCP_DECISION_URL;
    delete process.env.RULE_MCP_DECISION_TIMEOUT;
  }
});
