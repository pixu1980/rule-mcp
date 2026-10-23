

/** The L3 gate: deterministic candidates, a scripted model, and shadow records. */
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const stateDir = mkdtempSync(join(tmpdir(), "rule-decision-gate-"));

process.env.RULE_MCP_STATE_DIR = stateDir;
process.env.RULE_MCP_DECISION_CACHE_SHADOW = "1";
process.env.RULE_MCP_DECISION_MODEL = "laya";
process.env.RULE_MCP_DECISION_TIMEOUT = "1000";
delete process.env.RULE_MCP_NO_CACHE;

const { cacheClear, cacheStore } = await import("../index.js");
const { buildDecisionCandidates, observeDecisionShadow, shadowEnabled, shadowThreshold, waitForDecisionShadows } = await import("../_decision-gate.js");
const { clearShadows, readShadows } = await import("../_decision-shadow.js");
const { clearDecisionCache } = await import("../../../decision/_cache.js");
const { resetDecisionRuntime } = await import("../../../decision/_runtime.js");
const { startFakeServer } = await import("../../../decision/__tests__/fixtures/_fake-server.mjs");

test.after(() => {
  rmSync(stateDir, { recursive: true, force: true });
  delete process.env.RULE_MCP_STATE_DIR;
  delete process.env.RULE_MCP_DECISION_CACHE_SHADOW;
  delete process.env.RULE_MCP_DECISION_MODEL;
  delete process.env.RULE_MCP_DECISION_URL;
  delete process.env.RULE_MCP_DECISION_TIMEOUT;
});

function result(route) {
  return { content: [{ type: "text", text: JSON.stringify({ route }) }] };
}

function seed() {
  cacheClear();
  cacheStore("pix_tool", { prompt: "create a react button component", framework: "react" }, result("rule-frontend-react"), {});
  cacheStore("pix_tool", { prompt: "create a react form component", framework: "react" }, result("rule-frontend-react"), {});
  cacheStore("pix_tool", { prompt: "create a react button", framework: "vue" }, result("rule-frontend-vue"), {});
  cacheStore("other", { prompt: "create a react button" }, result("rule-other"), {});
}

async function scriptedServer() {
  return startFakeServer(({ url, body }) => {
    if (url !== "/v1/systemone") {
      return { body: { data: [] } };
    }

    const criteria = Object.keys(body.questions.pick.criteria);
    const pick = criteria[0];

    return {
      body: {
        answers: { pick: { choice: pick, probabilities: { [pick]: 0.95 } } },
        usage: { input_tokens: 12 },
      },
    };
  });
}

test("only same-tool, same-args, fresh, non-echoing calls become candidates", () => {
  seed();

  const candidates = buildDecisionCandidates("pix_tool", { prompt: "create a react component", framework: "react" });

  assert.equal(candidates.length, 2, "the store replicates L0/L1 but the gate dedupes the call");
  assert.equal(
    candidates.every((candidate) => candidate.label.startsWith("candidate-")),
    true,
  );
  assert.equal(candidates[0].route, "rule-frontend-react");
});

test("shadow records the model choice and never calls the cache replay", async () => {
  seed();
  clearShadows();
  clearDecisionCache();
  resetDecisionRuntime();
  const server = await scriptedServer();
  process.env.RULE_MCP_DECISION_URL = server.url;

  try {
    await observeDecisionShadow("pix_tool", { prompt: "create a react form component", framework: "react" }, { core: result("rule-frontend-react"), computeMs: 3 });
    await waitForDecisionShadows();
    const last = readShadows().at(-1);

    assert.equal(last.tool, "pix_tool");
    assert.equal(last.wouldReplay, true);
    assert.equal(last.choice, "candidate-1");
    assert.equal(last.probability, 0.95);
    assert.equal(last.decisionCacheHit, false);
    assert.equal(last.goldRoute, "rule-frontend-react");
    assert.equal(last.candidateRoute, "rule-frontend-react");
    assert.equal(last.correct, true);
    assert.equal(last.goldMs, 3);
    assert.match(last.promptHash, /^[a-f0-9]{12}$/u);
    assert.equal(JSON.stringify(last).includes("create a react"), false, "the report keeps no prompt text");
  } finally {
    await server.close();
  }
});

test("the second identical shadow call answers from the decision cache", async () => {
  clearShadows();
  const server = await scriptedServer();
  process.env.RULE_MCP_DECISION_URL = server.url;

  try {
    await observeDecisionShadow("pix_tool", { prompt: "create a react form component", framework: "react" });
    await waitForDecisionShadows();
    const last = readShadows().at(-1);

    assert.equal(last.decisionCacheHit, true);
    assert.equal(server.count, 0, "a decision-cache hit never opens a socket");
  } finally {
    await server.close();
  }
});

test("without the shadow flag the gate is inert", async () => {
  delete process.env.RULE_MCP_DECISION_CACHE_SHADOW;
  clearShadows();
  const server = await scriptedServer();
  process.env.RULE_MCP_DECISION_URL = server.url;

  try {
    await observeDecisionShadow("pix_tool", { prompt: "create a react form component", framework: "react" });
    await waitForDecisionShadows();

    assert.equal(shadowEnabled(), false);
    assert.deepEqual(readShadows(), []);
  } finally {
    process.env.RULE_MCP_DECISION_CACHE_SHADOW = "1";
    await server.close();
  }
});

test("an invalid threshold falls back to the explicit default", () => {
  process.env.RULE_MCP_DECISION_CACHE_THRESHOLD = "nope";

  try {
    assert.equal(shadowThreshold(), 0.7);
  } finally {
    delete process.env.RULE_MCP_DECISION_CACHE_THRESHOLD;
  }
});
