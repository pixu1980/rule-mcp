

/** The semantic family: advisory, skipped without an endpoint, measured on its pair corpus. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { resetDecisionRuntime } from "../../../decision/_runtime.js";
import { startFakeServer } from "../../../decision/__tests__/fixtures/_fake-server.mjs";
import { CORPUS } from "../../../../../tests/fixtures/semantic-guardrail-corpus.mjs";
import { checkSemantic, SEMANTIC_GUARDRAILS } from "../index.js";

const ENV = ["RULE_MCP_DECISION_MODEL", "RULE_MCP_DECISION_URL", "RULE_MCP_DECISION_TIMEOUT"];

async function withModel(url, body) {
  const previous = Object.fromEntries(ENV.map((name) => [name, process.env[name]]));

  process.env.RULE_MCP_DECISION_MODEL = "laya";
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

async function startModel() {
  return startFakeServer(({ url, body }) => {
    if (url !== "/v1/systemone") {
      return { body: { data: [] } };
    }

    const good = /Set DATABASE_URL|must contain/u.test(body.state);

    return {
      body: {
        answers: { message: { noul: good ? 0.9 : 0.1 } },
        usage: { input_tokens: 12 },
      },
    };
  });
}

test("with no endpoint the rule is skipped, not failed", async () => {
  const previous = process.env.RULE_MCP_DECISION_MODEL;
  delete process.env.RULE_MCP_DECISION_MODEL;
  resetDecisionRuntime();

  try {
    const result = await checkSemantic('throw new Error("Failed");');

    assert.equal(result.enabled, false);
    assert.equal(result.advisoryCount, 0);
    assert.equal(result.allPass, true);
    assert.match(result.summary, /skipped/u);
  } finally {
    if (previous !== undefined) {
      process.env.RULE_MCP_DECISION_MODEL = previous;
    }

    resetDecisionRuntime();
  }
});

test("code with no error message is not sent to the model", async () => {
  const result = await checkSemantic("export const answer = 42;\n");

  assert.equal(result.advisoryCount, 0);
  assert.match(result.summary, /No error message/u);
});

test("the fixture corpus reaches 100% precision and recall with the fake model", async () => {
  const server = await startModel();

  try {
    await withModel(server.url, async () => {
      const results = [];

      for (const fixture of CORPUS) {
        const result = await checkSemantic(fixture.code);

        results.push({
          label: fixture.label,
          flagged: result.advisoryCount > 0,
          detail: result.advisory[0]?.detail?.join(" ") ?? "",
        });
      }

      const truePositive = results.filter((result) => result.label === "bad" && result.flagged).length;
      const falsePositive = results.filter((result) => result.label === "good" && result.flagged).length;
      const falseNegative = results.filter((result) => result.label === "bad" && !result.flagged).length;

      assert.equal(truePositive, 2);
      assert.equal(falsePositive, 0);
      assert.equal(falseNegative, 0);
      assert.match(results.find((result) => result.label === "bad").detail, /0\.10/u);
    });
  } finally {
    await server.close();
  }
});

test("the rule is in the semantic family with its source", () => {
  assert.equal(SEMANTIC_GUARDRAILS.length, 1);
  assert.equal(SEMANTIC_GUARDRAILS[0].id, "semantic-error-message-actionable");
  assert.match(SEMANTIC_GUARDRAILS[0].description, /ADR 156/u);
});
