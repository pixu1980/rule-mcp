

/** The corpus measurer counts the same ruler the routing corpus test asserts. */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { buildQuestion, compareOff, pickOf, shortlistFor, summarize } from "../_corpus-measure.mjs";

const FIXTURE = new URL("../../../../tests/fixtures/decision-models/corpus-baseline.json", import.meta.url);

test("summarize counts exact and top-or-alternative", () => {
  const rows = [
    { exact: true, inAlternatives: false },
    { exact: false, inAlternatives: true },
    { exact: false, inAlternatives: false },
  ];

  assert.deepEqual(summarize(rows), { total: 3, exact: 1, top: 2, exactRate: 0.333, topRate: 0.667 });
});

test("shortlistFor keeps the route first and caps the list", () => {
  const row = { got: "rule-a", alternatives: ["rule-b", "rule-c", "rule-d"] };

  assert.deepEqual(shortlistFor(row, 3), ["rule-a", "rule-b", "rule-c"]);
  assert.deepEqual(shortlistFor(row, 0), ["rule-a"]);
});

test("a described choice carries the labels, a catalog choice carries the names", () => {
  const options = [
    { name: "rule-a", description: "does a" },
    { name: "rule-b", description: "does b" },
  ];

  assert.deepEqual(buildQuestion(options, { described: true }).pick.criteria, { "rule-a": "does a", "rule-b": "does b" });
  assert.deepEqual(buildQuestion(options, { described: false }).pick.options, ["rule-a", "rule-b"]);
});

test("pickOf reads the router answer shape", () => {
  assert.equal(pickOf({ answers: { pick: { choice: "rule-a" } } }), "rule-a");
  assert.equal(pickOf({ answers: { pick: "rule-b" } }), "rule-b");
  assert.equal(pickOf({ answers: {} }), null);
});

test("a fixture count that disagrees with its rows is reported", () => {
  assert.deepEqual(compareOff({ total: 2, exact: 1, top: 1 }, { total: 2, exact: 1, top: 1 }), []);
  assert.deepEqual(compareOff({ total: 2, exact: 1, top: 1 }, { total: 2, exact: 2, top: 2 }), ["off.exact: fixture 1, live 2", "off.top: fixture 1, live 2"]);
});

test("the committed baseline carries the corrected ruler and the recorded model run", () => {
  const fixture = JSON.parse(readFileSync(FIXTURE, "utf8"));
  const { rows, ...off } = fixture.off;

  assert.equal(rows.length, fixture.off.total, "every corpus prompt has a row");
  assert.deepEqual(summarize(rows), off, "the counts are derived from the rows, not typed beside them");
  assert.equal(fixture.on.shortlist.addressable, 13);
  assert.equal(fixture.on.shortlist.fixed, 3);
  assert.equal(fixture.on.catalog.fixed, 1);
});
