

/** The shortlist cap and the answer shape the reranker reads. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { buildChoiceQuestion, probabilityOf, rerankShortlist, SHORTLIST_CAP } from "../_rerank.js";

const option = (name) => ({ skill: `rule-mcp-${name}`, description: `does ${name}` });

test("a shortlist above six options is refused with the cap in the message", () => {
  const seven = Array.from({ length: 7 }, (_, index) => option(`s${index}`));

  assert.equal(SHORTLIST_CAP, 6);
  assert.throws(() => buildChoiceQuestion(seven), /caps at six options, got 7/u);
  assert.throws(
    () => buildChoiceQuestion(seven),
    (error) => error.code === "shortlist",
  );
});

test("the choice question describes every option", () => {
  assert.deepEqual(buildChoiceQuestion([option("a"), option("b")]).pick.criteria, { "rule-mcp-a": "does a", "rule-mcp-b": "does b" });
});

test("rerankShortlist returns the pick and the probability of the chosen label", async () => {
  let asked;

  const answer = await rerankShortlist({
    prompt: "route this",
    shortlist: [option("a"), option("b")],
    model: "laya",
    ask: async (prompt, questions) => {
      asked = { prompt, questions };

      return {
        answers: { pick: { choice: "rule-mcp-b", probabilities: { "rule-mcp-a": 0.2, "rule-mcp-b": 0.8 } } },
        usage: { input_tokens: 9 },
        ms: 12,
      };
    },
  });

  assert.equal(answer.pick, "rule-mcp-b");
  assert.equal(answer.probability, 0.8);
  assert.equal(answer.usage.input_tokens, 9);
  assert.equal(asked.prompt, "route this");
  assert.deepEqual(Object.keys(asked.questions.pick.criteria), ["rule-mcp-a", "rule-mcp-b"]);
});

test("probabilityOf treats an absent distribution as zero", () => {
  assert.equal(probabilityOf({ answers: { pick: { choice: "a", probabilities: { a: 0.7 } } } }, "a"), 0.7);
  assert.equal(probabilityOf({ answers: {} }, "a"), 0);
});
