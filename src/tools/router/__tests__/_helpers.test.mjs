/** Result shaping helpers: banner guards, size accounting, guardrail tallies. */
import { strict as assert } from "node:assert";
import test from "node:test";

import { argsBytes, estimateTokens, guardrailRulesOf, textBytes, withBanner } from "../_helpers.js";

test("withBanner prepends the banner to content and tolerates odd cores", () => {
  const decorated = withBanner("GLOBAL", { content: [{ type: "text", text: "root" }] });
  assert.equal(decorated.content[0].text, "GLOBAL", "the banner lands first");

  assert.deepEqual(withBanner("", { content: [] }), { content: [] }, "no banner passes through");
  assert.deepEqual(withBanner(null, { content: [1] }), { content: [1] }, "null banner passes through");
  assert.deepEqual(withBanner("x", { content: "not-array" }), { content: "not-array" }, "non-array content passes through");
  assert.deepEqual(withBanner("x", null), null, "null result passes through");
});

test("argsBytes measures json length and tolerates the unmeasurable", () => {
  assert.equal(argsBytes(), 0, "no args means zero bytes");
  assert.equal(argsBytes({ a: 1 }), JSON.stringify({ a: 1 }).length, "a json-serializable arg measures");

  const circular = {};
  circular.self = circular;
  assert.equal(argsBytes(circular), 0, "a circular arg fails safe");
});

test("textBytes counts the text in content and estimateTokens rounds up", () => {
  assert.equal(
    textBytes({
      content: [
        { type: "text", text: "abcd" },
        { type: "text", text: "ef" },
      ],
    }),
    6,
    "text fields sum",
  );
  assert.equal(textBytes({}), 0, "no content means zero bytes");
  assert.equal(textBytes({ content: [{}] }), 0, "an item without text contributes nothing");
  assert.equal(estimateTokens({ content: [{ type: "text", text: "abcdefgh" }] }), 2, "characters over four round up");
});

test("guardrailRulesOf tallies failed rules and tolerates empty reports", () => {
  const tally = guardrailRulesOf({
    _meta: {
      pixGuardrails: {
        failed: [
          { id: "a", failCount: 3 },
          { id: "b", failCount: 0 },
        ],
      },
    },
  });
  assert.deepEqual(tally, { a: 3, b: 1 }, "failCounts carry and zeroes go to one");

  assert.equal(guardrailRulesOf({}), undefined, "no report means no tally");
  assert.equal(guardrailRulesOf({ _meta: { pixGuardrails: { failed: [] } } }), undefined, "no failures means no tally");
});
