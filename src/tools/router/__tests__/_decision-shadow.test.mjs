/** The router pipeline runs the L3 gate in shadow: it observes, it never replays. */
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const stateDir = mkdtempSync(join(tmpdir(), "rule-mcp-decision-shadow-"));

process.env.RULE_MCP_STATE_DIR = stateDir;
process.env.RULE_MCP_NO_SYNC_GUARD = "1";
process.env.RULE_MCP_SKILL_UNIVERSE = "base";
process.env.RULE_MCP_DECISION_CACHE_SHADOW = "1";
process.env.RULE_MCP_DECISION_MODEL = "laya";
process.env.RULE_MCP_DECISION_TIMEOUT = "1000";
delete process.env.RULE_MCP_NO_CACHE;

const { loadAllSkills } = await import("../../../core/skills/index.js");
const { callTool } = await import("../index.js");
const { cacheClear } = await import("../../../core/cache/tool-cache/index.js");
const { clearShadows, readShadows } = await import("../../../core/cache/tool-cache/_decision-shadow.js");
const { waitForDecisionShadows } = await import("../../../core/cache/tool-cache/_decision-gate.js");
const { clearDecisionCache } = await import("../../../core/decision/_cache.js");
const { resetDecisionRuntime } = await import("../../../core/decision/_runtime.js");
const { startFakeServer } = await import("../../../core/decision/__tests__/fixtures/_fake-server.mjs");

await loadAllSkills(true);

test.after(() => {
  rmSync(stateDir, { recursive: true, force: true });
  delete process.env.RULE_MCP_STATE_DIR;
  delete process.env.RULE_MCP_DECISION_CACHE_SHADOW;
  delete process.env.RULE_MCP_DECISION_MODEL;
  delete process.env.RULE_MCP_DECISION_URL;
  delete process.env.RULE_MCP_DECISION_TIMEOUT;
});

test("the pipeline observes a would-be replay and still computes the answer", async () => {
  cacheClear();
  clearShadows();
  clearDecisionCache();
  resetDecisionRuntime();
  const server = await startFakeServer(({ url, body }) => {
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
  process.env.RULE_MCP_DECISION_URL = server.url;

  try {
    await callTool("rule_tool", { prompt: "create a react button component" });
    await waitForDecisionShadows();
    const second = await callTool("rule_tool", { prompt: "create a react form component" });
    await waitForDecisionShadows();

    const parsed = JSON.parse(second.content[0].text);
    const records = readShadows();
    const last = records.at(-1);

    assert.equal(parsed._meta?.ruleCache, undefined, "phase 1 never replays a decision");
    assert.equal(
      records.some((record) => record.reason === "no-candidates"),
      true,
    );
    assert.equal(last.tool, "rule_tool");
    assert.equal(last.wouldReplay, true);
    assert.equal(last.choice, "candidate-1");
    assert.equal(JSON.stringify(last).includes("create a react"), false, "the report keeps no prompt text");
  } finally {
    await server.close();
  }
});
