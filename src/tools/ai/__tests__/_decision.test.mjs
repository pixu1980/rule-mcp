/** rule_tool reports the model's distribution and gates the override on it. */
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

const PROMPT = "I need a React button component";
const ENV = ["RULE_MCP_DECISION_MODEL", "RULE_MCP_DECISION_URL", "RULE_MCP_DECISION_TIMEOUT"];

async function routePrompt(prompt) {
  return JSON.parse((await callTool("rule_tool", { prompt })).content[0].text);
}

async function withDecision({ model = "laya", url } = {}, body) {
  const previous = Object.fromEntries(ENV.map((name) => [name, process.env[name]]));

  if (model) {
    process.env.RULE_MCP_DECISION_MODEL = model;
  } else {
    delete process.env.RULE_MCP_DECISION_MODEL;
  }

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

function fixedAnswer(probability) {
  let criteria = [];

  const server = startFakeServer(({ url, body }) => {
    if (url !== "/v1/systemone") {
      return { body: { data: [] } };
    }

    criteria = Object.keys(body.questions.pick.criteria);
    const pick = criteria[0];

    return {
      body: {
        answers: { pick: { choice: pick, probabilities: { [pick]: probability } } },
        usage: { input_tokens: 12 },
      },
    };
  });

  return { server, criteria: () => criteria };
}

test("the model's distribution becomes the chosen skill's confidence", async () => {
  const { server, criteria } = fixedAnswer(0.9);
  const running = await server;

  try {
    await withDecision({ url: running.url }, async () => {
      const result = await routePrompt(PROMPT);

      assert.equal(result.route, "rule-frontend-react");
      assert.equal(result.confidence, 0.9);
      assert.equal(result.uncertain, false);
      assert.equal(criteria()[0], "rule-frontend-react");
      assert.ok(criteria().length <= 6, "the model never sees more than six options");
    });
  } finally {
    await running.close();
  }
});

test("a probability below the registry threshold marks the answer uncertain", async () => {
  const { server } = fixedAnswer(0.01);
  const running = await server;

  try {
    await withDecision({ url: running.url }, async () => {
      const result = await routePrompt(PROMPT);

      assert.equal(result.uncertain, true);
      assert.equal(result.route, "unknown");
    });
  } finally {
    await running.close();
  }
});

test("without a configured model the router never opens a socket", async () => {
  const server = await startFakeServer(() => ({ body: { data: [] } }));

  try {
    await withDecision({ model: null, url: server.url }, async () => {
      const result = await routePrompt(PROMPT);

      assert.equal(result.route, "rule-frontend-react");
      assert.equal(result.uncertain, false);
      assert.equal(server.count, 0);
    });
  } finally {
    await server.close();
  }
});
