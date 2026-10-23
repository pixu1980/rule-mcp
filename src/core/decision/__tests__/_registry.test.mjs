

/** The registry names the model, its threshold and its languages. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { DECISION_MODELS, modelFits, modelForLanguage, resolveDecisionModel } from "../_registry.js";

test("the registry resolves the plan aliases and their thresholds", () => {
  const laya = resolveDecisionModel("laya");

  assert.equal(laya.id, "ggml-org/Laya-GGUF");
  assert.equal(laya.threshold, 0.05);
  assert.equal(resolveDecisionModel(laya.id), laya);
  assert.equal(resolveDecisionModel("julia").languages.includes("it"), true);
  assert.equal(resolveDecisionModel("missing"), null);
  assert.equal(resolveDecisionModel(""), null);
  assert.ok(Object.isFrozen(DECISION_MODELS));
});

test("every entry carries a size, a context, its languages and a shortlist cap", () => {
  const laya = resolveDecisionModel("laya");
  const julia = resolveDecisionModel("julia");

  assert.equal(laya.size, 421_000_000);
  assert.equal(laya.context, 8192);
  assert.equal(laya.shortlist, 6);
  assert.deepEqual(laya.languages, ["en"]);
  assert.equal(julia.size, 144_000_000);
  assert.equal(julia.context, 8192);
  assert.equal(julia.shortlist, 6);
  assert.deepEqual(julia.languages, ["en", "it"]);
});

test("the language picks the model and a context that cannot hold the cap is refused", () => {
  assert.equal(modelForLanguage("en").id, "ggml-org/Laya-GGUF");
  assert.equal(modelForLanguage("it").id, "ggml-org/Julia-1-GGUF:Q8_0");
  assert.equal(modelForLanguage("fr"), null);
  assert.equal(modelFits(resolveDecisionModel("laya"), 6), true);
  assert.equal(modelFits({ shortlist: 6, context: 64 }, 6), false);
  assert.equal(modelFits(null, 6), false);
});
