/** @module test/operation-intent - whole-token depth intent for a persona run */

import { strict as assert } from "node:assert";
import { test } from "node:test";

import { OPERATION_INTENT_KEYWORDS, PLAN_INTENT_KEYWORDS, REVIEW_INTENT_KEYWORDS, operationForPrompt } from "../_operation-intent.js";

test("no stage keyword means the cheapest run: audit", () => {
  assert.equal(operationForPrompt(""), "audit");
  assert.equal(operationForPrompt(null), "audit");
  assert.equal(operationForPrompt(), "audit");
  assert.equal(operationForPrompt("the auth flow"), "audit");
  assert.equal(operationForPrompt("dammi un parere su questo file"), "audit");
});

test("review intent raises the run to audit plus review", () => {
  assert.equal(operationForPrompt("review the checkout page"), "review");
  assert.equal(operationForPrompt("list the findings"), "review");
  assert.equal(operationForPrompt("what problems do you see"), "review");
  assert.equal(operationForPrompt("analizza il modulo auth"), "review");
  assert.equal(operationForPrompt("valuta i rischi"), "review");
  assert.equal(operationForPrompt("esamina la criticita aperte"), "review");
});

test("plan intent asks for the deepest run: audit, review and plan", () => {
  assert.equal(operationForPrompt("plan the SSE fix"), "plan");
  assert.equal(operationForPrompt("give me a roadmap"), "plan");
  assert.equal(operationForPrompt("which steps remain"), "plan");
  assert.equal(operationForPrompt("pianifica la migrazione"), "plan");
  assert.equal(operationForPrompt("dammi i passi da fare"), "plan");
});

test("plan outranks review when both appear in one prompt", () => {
  assert.equal(operationForPrompt("review the findings and plan the fix"), "plan");
  assert.equal(operationForPrompt("analizza e pianifica"), "plan");
});

test("whole-token matching ignores substrings", () => {
  assert.equal(operationForPrompt("a plane landed"), "audit");
  assert.equal(operationForPrompt("checkbox layout"), "audit");
  assert.equal(operationForPrompt("reviews of reviewers"), "review", "an inflected form is its own whole token");
});

test("the exported keyword lists stay non-empty, lowercase and ASCII", () => {
  for (const [name, list] of Object.entries(OPERATION_INTENT_KEYWORDS)) {
    assert.ok(list.length >= 5, `${name} needs a usable set`);

    for (const word of list) {
      assert.equal(word, word.toLowerCase(), `${name}: ${word} must be lowercase`);
      assert.equal(word, word.normalize("NFD").replaceAll(/\p{Diacritic}/gu, ""), `${name}: ${word} must be ASCII (accents are stripped at match time)`);
      assert.ok(!/\s/.test(word), `${name}: ${word} must be one token`);
    }
  }

  assert.equal(OPERATION_INTENT_KEYWORDS.review, REVIEW_INTENT_KEYWORDS);
  assert.equal(OPERATION_INTENT_KEYWORDS.plan, PLAN_INTENT_KEYWORDS);
});
