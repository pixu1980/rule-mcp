

/** Branch coverage for the explainer's fall-through arms. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { explainViolation, isSystemSubject } from "../_rule.js";

test("a missing subject is not a system message", () => {
  assert.equal(isSystemSubject(), false, "the nullish subject is empty, not a merge");
});

test("an empty subject is explained", () => {
  assert.equal(explainViolation(), "the subject is empty");
});

test("a subject that does not start with a type is explained", () => {
  assert.match(explainViolation("123 abc"), /does not start with a type/u);
});

test("a scope with an upper-case letter or a space is explained", () => {
  assert.match(explainViolation("feat(Bad Scope): x"), /scope must be lower-case/u);
});

test("a subject that passes every loose check still falls through", () => {
  assert.equal(explainViolation("feat(scope):x"), "the subject does not match type(scope): subject");
});
