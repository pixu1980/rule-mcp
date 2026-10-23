

/** The decision cache short-circuits before the runtime switches models. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

process.env.RULE_MCP_NO_SYNC_GUARD = "1";
process.env.RULE_MCP_SKILL_UNIVERSE = "base";
delete process.env.RULE_MCP_NO_CACHE;

const { loadAllSkills } = await import("../../../core/skills/index.js");
const { applyDecision } = await import("../_decision.js");
const { clearDecisionCache } = await import("../../../core/decision/_cache.js");
const { resetDecisionRuntime } = await import("../../../core/decision/_runtime.js");
const { getSkillMetadata } = await import("../../router/index.js");
const { startFakeServer } = await import("../../../core/decision/__tests__/fixtures/_fake-server.mjs");

await loadAllSkills(true);

const top = ["rule-frontend-react", "rule-styleguide-a11y", "rule-devops-testing", "rule-platform-web", "rule-frontend", "rule-styleguide-i18n"].map((skill, index) => ({
  skill,
  relativeScore: 1 - index / 10,
  absoluteScore: 20 - index,
  sections: [],
  next_tools: [],
  description: getSkillMetadata(skill)?.description ?? "",
}));
const primaryRoute = top[0];
const ITALIAN = "Come faccio a creare un componente React?";
const ENGLISH = "I need a React button component";
const ENV = ["RULE_MCP_DECISION_MODEL", "RULE_MCP_DECISION_URL", "RULE_MCP_DECISION_TIMEOUT"];

async function withAuto(url, body) {
  const previous = Object.fromEntries(ENV.map((name) => [name, process.env[name]]));

  process.env.RULE_MCP_DECISION_MODEL = "auto";
  process.env.RULE_MCP_DECISION_URL = url;
  process.env.RULE_MCP_DECISION_TIMEOUT = "1000";
  resetDecisionRuntime();
  clearDecisionCache();

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
    clearDecisionCache();
  }
}

async function scriptedServer() {
  const requests = [];
  const models = [];
  const server = await startFakeServer(({ url, body }) => {
    requests.push(url);

    if (url === "/models") {
      return { body: { data: [] } };
    }

    if (url === "/models/unload") {
      return { body: { success: true } };
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

  return { server, requests, models };
}

test("a cached decision short-circuits before the runtime switches models", async () => {
  const { server, requests, models } = await scriptedServer();

  try {
    await withAuto(server.url, async () => {
      const italian = await applyDecision({ prompt: ITALIAN, top, primaryRoute });
      const english = await applyDecision({ prompt: ENGLISH, top, primaryRoute });
      const before = requests.length;
      const again = await applyDecision({ prompt: ITALIAN, top, primaryRoute });

      assert.equal(again.skill, italian.skill);
      assert.equal(again.confidence, italian.confidence);
      assert.deepEqual(models, ["ggml-org/Julia-1-GGUF:Q8_0", "ggml-org/Laya-GGUF"]);
      assert.equal(requests.length, before, "a cached decision must not touch the router");
      assert.equal(english.skill, "rule-frontend-react");
    });
  } finally {
    await server.close();
  }
});

test("RULE_MCP_NO_CACHE=1 disables the decision short-circuit", async () => {
  const { server, models } = await scriptedServer();
  const previous = process.env.RULE_MCP_NO_CACHE;
  process.env.RULE_MCP_NO_CACHE = "1";

  try {
    await withAuto(server.url, async () => {
      await applyDecision({ prompt: ITALIAN, top, primaryRoute });
      await applyDecision({ prompt: ENGLISH, top, primaryRoute });
      await applyDecision({ prompt: ITALIAN, top, primaryRoute });

      assert.deepEqual(models, ["ggml-org/Julia-1-GGUF:Q8_0", "ggml-org/Laya-GGUF", "ggml-org/Julia-1-GGUF:Q8_0"]);
    });
  } finally {
    if (previous === undefined) {
      delete process.env.RULE_MCP_NO_CACHE;
    } else {
      process.env.RULE_MCP_NO_CACHE = previous;
    }

    await server.close();
  }
});
