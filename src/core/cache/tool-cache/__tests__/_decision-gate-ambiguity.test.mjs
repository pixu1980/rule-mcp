/** The hub/leaf ambiguity, recorded through the real gate path. */
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const stateDir = mkdtempSync(join(tmpdir(), "rule-mcp-decision-ambiguity-"));

process.env.RULE_MCP_STATE_DIR = stateDir;
process.env.RULE_MCP_DECISION_CACHE_SHADOW = "1";
process.env.RULE_MCP_DECISION_MODEL = "laya";
process.env.RULE_MCP_DECISION_TIMEOUT = "1000";
delete process.env.RULE_MCP_NO_CACHE;

const { cacheClear, cacheStore } = await import("../index.js");
const { observeDecisionShadow, waitForDecisionShadows } = await import("../_decision-gate.js");
const { clearShadows, readShadows } = await import("../_decision-shadow.js");
const { clearDecisionCache } = await import("../../../decision/_cache.js");
const { resetDecisionRuntime } = await import("../../../decision/_runtime.js");
const { startFakeServer } = await import("../../../decision/__tests__/fixtures/_fake-server.mjs");

function result(route) {
  return { content: [{ type: "text", text: JSON.stringify({ route }) }] };
}

test.after(() => {
  rmSync(stateDir, { recursive: true, force: true });
  delete process.env.RULE_MCP_STATE_DIR;
  delete process.env.RULE_MCP_DECISION_CACHE_SHADOW;
  delete process.env.RULE_MCP_DECISION_MODEL;
  delete process.env.RULE_MCP_DECISION_URL;
  delete process.env.RULE_MCP_DECISION_TIMEOUT;
});

test("a hub pick beside a leaf is recorded as ambiguous and never replays", async () => {
  cacheClear();
  cacheStore("rule_tool", { prompt: "create a react form component", framework: "react" }, result("rule-frontend"), {});
  cacheStore("rule_tool", { prompt: "create a react form", framework: "react" }, result("rule-frontend-react"), {});
  clearShadows();
  clearDecisionCache();
  resetDecisionRuntime();
  const server = await startFakeServer(({ url, body }) => {
    if (url !== "/v1/systemone") {
      return { body: { data: [] } };
    }

    const criteria = body.questions.pick.criteria;
    const hub = Object.keys(criteria).find((label) => criteria[label].endsWith("skill: rule-frontend"));

    return {
      body: {
        answers: { pick: { choice: hub, probabilities: { [hub]: 0.95 } } },
        usage: { input_tokens: 12 },
      },
    };
  });
  process.env.RULE_MCP_DECISION_URL = server.url;

  try {
    await observeDecisionShadow("rule_tool", { prompt: "create a react form component", framework: "react" }, { core: result("rule-frontend"), computeMs: 3 });
    await waitForDecisionShadows();
    const last = readShadows().at(-1);

    assert.equal(last.candidateRoute, "rule-frontend");
    assert.equal(last.reason, "ambiguous-hub");
    assert.equal(last.guard, "ambiguous-hub");
    assert.equal(last.wouldReplay, false);
    assert.equal(last.correct, true);
  } finally {
    await server.close();
  }
});
