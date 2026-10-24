

/** Branch coverage for the shortlist guards and the missing-field normalization. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { buildChoiceQuestion, probabilityOf, rerankShortlist } from "../_rerank.js";

const cache = { key: () => "k", read: () => null, write: () => {} };

test("the shortlist guards cover a non-array, an empty list and the cap", () => {
  assert.throws(() => buildChoiceQuestion("rule-mcp"), /at least one option/u);
  assert.throws(() => buildChoiceQuestion([]), /at least one option/u);
  assert.throws(() => buildChoiceQuestion(Array.from({ length: 7 }, (_, index) => ({ skill: `s${index}` }))), /caps at six/u);
});

test("a missing probability distribution is zero, not a guess", () => {
  assert.equal(probabilityOf(undefined, null), 0);
  assert.equal(probabilityOf({ answers: { pick: { probabilities: { a: 0.5 } } } }, "a"), 0.5);
  assert.equal(probabilityOf({ answers: { pick: { probabilities: { a: 0.5 } } } }, "b"), 0);
});

test("a string pick is accepted and the missing fields are normalized", async () => {
  const stringPick = await rerankShortlist({
    prompt: "p",
    shortlist: [{ skill: "a" }],
    ask: async () => ({ answers: { pick: "a" } }),
    cache,
  });

  assert.equal(stringPick.pick, "a");
  assert.equal(stringPick.probability, 0);
  assert.deepEqual(stringPick.usage, {});
  assert.equal(stringPick.ms, 0);
});

test("no choice and no answers at all both resolve to null", async () => {
  const noChoice = await rerankShortlist({
    prompt: "p",
    shortlist: [{ skill: "a" }],
    ask: async () => ({ answers: { pick: {} } }),
    cache,
  });

  assert.equal(noChoice.pick, null);

  const empty = await rerankShortlist({ prompt: "p", shortlist: [{ skill: "a" }], ask: async () => ({}), cache });

  assert.equal(empty.pick, null);
  assert.deepEqual(empty.answers, {});
});

test("a cache hit is returned without asking", async () => {
  let asked = false;
  const hit = await rerankShortlist({
    prompt: "p",
    shortlist: [{ skill: "a" }],
    ask: async () => {
      asked = true;
    },
    cache: { key: () => "k", read: () => ({ pick: "b" }), write: () => {} },
  });

  assert.equal(hit.pick, "b");
  assert.equal(asked, false);
});
