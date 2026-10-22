

/** The registry names the model, its threshold and its languages. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { DECISION_MODELS, resolveDecisionModel } from "../_registry.js";

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
