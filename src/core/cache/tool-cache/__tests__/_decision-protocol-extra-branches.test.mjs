

/** Branch coverage for the decision protocol's empty values and answer shapes. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { buildGateState, parseGateAnswer, promptHash, redact, truncate } from "../_decision-protocol.js";

test("the redactors accept a missing value", () => {
  assert.equal(redact(), "");
  assert.equal(truncate(), "");
  assert.equal(promptHash(), "e3b0c44298fc", "the empty hash is stable");
});

test("a tool without a prompt field and an undefined argument build a state", () => {
  const state = buildGateState({ toolName: "rule_tool_check", args: { a: undefined, b: "x" }, livePrompt: "p", candidates: [1] });

  assert.match(state, /^tool: rule_tool_check$/mu);
  assert.match(state, /^b: x$/mu);
  assert.doesNotMatch(state, /^a:/mu);
});

test("a long state is capped", () => {
  const args = Object.fromEntries(Array.from({ length: 20 }, (_, index) => [`k${index}`, "x".repeat(100)]));
  const state = buildGateState({ toolName: "pix_tool", args, livePrompt: "p", candidates: [] });

  assert.equal(state.length, 600);
  assert.ok(state.endsWith("..."));
});

test("a bare pick with a numeric probability is read", () => {
  const candidates = [{ label: "rule-styleguide-css", description: "d" }];
  const parsed = parseGateAnswer({ pick: "rule-styleguide-css", probability: 0.9 }, candidates);

  assert.equal(parsed.choice, "rule-styleguide-css");
  assert.equal(parsed.probability, 0.9);
  assert.equal(parsed.wouldReplay, true);
});

test("a pick object without a choice is no-choice", () => {
  const parsed = parseGateAnswer({ answers: { pick: {} } }, []);

  assert.equal(parsed.reason, "no-choice");
  assert.equal(parsed.choice, null);
});

test("a missing answer is no-choice", () => {
  assert.equal(parseGateAnswer(undefined, []).reason, "no-choice");
});
