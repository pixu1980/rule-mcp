

/** The decision cache: one digest, one answer, and the no-cache escape. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { cacheKey, clearDecisionCache } from "../_cache.js";
import { rerankShortlist } from "../_rerank.js";
import { RECORDED_DECISION } from "../../../../tests/fixtures/decision-models/recorded-answer.mjs";

const shortlist = [{ skill: "billing" }, { skill: "shipping" }, { skill: "technical" }];
const questions = { pick: { type: "choice", criteria: { billing: "", shipping: "", technical: "" } } };

test("the key folds the model, the state and the shortlist", () => {
  const key = (model, state, value = questions) => cacheKey({ model, state, questions: value });

  assert.equal(key("laya", "x"), key("laya", "x"));
  assert.notEqual(key("laya", "x"), key("julia-1", "x"));
  assert.notEqual(key("laya", "x"), key("laya", "y"));
  assert.notEqual(key("laya", "x"), key("laya", "x", { pick: { type: "choice", criteria: { billing: "" } } }));
});

test("the same state and shortlist answer from the cache; a different model misses it", async () => {
  clearDecisionCache();
  let calls = 0;
  const ask = async () => {
    calls += 1;

    return RECORDED_DECISION;
  };

  const first = await rerankShortlist({ prompt: "I was charged twice", shortlist, ask, model: "laya" });
  const second = await rerankShortlist({ prompt: "I was charged twice", shortlist, ask, model: "laya" });

  assert.equal(calls, 1);
  assert.deepEqual(second, first);

  await rerankShortlist({ prompt: "I was charged twice", shortlist, ask, model: "julia-1" });

  assert.equal(calls, 2);
});

test("RULE_MCP_NO_CACHE=1 bypasses the cache", async () => {
  const previous = process.env.RULE_MCP_NO_CACHE;
  process.env.RULE_MCP_NO_CACHE = "1";
  clearDecisionCache();
  let calls = 0;
  const ask = async () => {
    calls += 1;

    return RECORDED_DECISION;
  };

  try {
    await rerankShortlist({ prompt: "x", shortlist, ask, model: "laya" });
    await rerankShortlist({ prompt: "x", shortlist, ask, model: "laya" });

    assert.equal(calls, 2);
  } finally {
    if (previous === undefined) {
      delete process.env.RULE_MCP_NO_CACHE;
    } else {
      process.env.RULE_MCP_NO_CACHE = previous;
    }
  }
});

test("a recorded real answer replays to the same numbers", async () => {
  clearDecisionCache();
  const answer = await rerankShortlist({
    prompt: "I was charged twice",
    shortlist,
    ask: async () => RECORDED_DECISION,
    model: "laya",
  });

  assert.equal(answer.pick, "billing");
  assert.equal(answer.probability, 0.9917);
  assert.equal(answer.usage.input_tokens, 67);
  assert.equal(answer.ms, 42);
});
