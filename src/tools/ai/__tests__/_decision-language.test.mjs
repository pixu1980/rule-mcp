/** `auto` reads the prompt's language and asks the model that covers it. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

process.env.RULE_MCP_NO_CACHE = "1";
process.env.RULE_MCP_NO_SYNC_GUARD = "1";
process.env.RULE_MCP_SKILL_UNIVERSE = "base";

const { loadAllSkills } = await import("../../../core/skills/index.js");
const { callTool } = await import("../../router/index.js");
const { resetDecisionRuntime } = await import("../../../core/decision/_runtime.js");
const { startFakeServer } = await import("../../../core/decision/__tests__/fixtures/_fake-server.mjs");

await loadAllSkills(true);

const ENV = ["RULE_MCP_DECISION_MODEL", "RULE_MCP_DECISION_URL", "RULE_MCP_DECISION_TIMEOUT"];

async function routePrompt(prompt) {
  return JSON.parse((await callTool("rule_tool", { prompt })).content[0].text);
}

async function withAuto(url, body) {
  const previous = Object.fromEntries(ENV.map((name) => [name, process.env[name]]));

  process.env.RULE_MCP_DECISION_MODEL = "auto";
  process.env.RULE_MCP_DECISION_URL = url;
  process.env.RULE_MCP_DECISION_TIMEOUT = "1000";
  resetDecisionRuntime();

  try {
    return await body();
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }

    resetDecisionRuntime();
  }
}

test("auto selects Julia for Italian and Laya for English", async () => {
  const models = [];
  const server = await startFakeServer(({ url, body }) => {
    if (url !== "/v1/systemone") {
      return { body: { data: [] } };
    }

    models.push(body.model);
    const criteria = Object.keys(body.questions.pick.criteria);
    const pick = criteria[0];

    return {
      body: {
        answers: { pick: { choice: pick, probabilities: { [pick]: 0.9 } } },
        usage: { input_tokens: 12 },
      },
    };
  });

  try {
    await withAuto(server.url, async () => {
      const italian = await routePrompt("Come faccio a creare un componente React?");
      const english = await routePrompt("I need a React button component");

      assert.deepEqual(models, ["ggml-org/Julia-1-GGUF:Q8_0", "ggml-org/Laya-GGUF:Q8_0"]);
      assert.equal(italian.route, "rule-frontend-react");
      assert.equal(italian.confidence, 0.9);
      assert.equal(english.route, "rule-frontend-react");
      assert.equal(english.confidence, 0.9);
    });
  } finally {
    await server.close();
  }
});
