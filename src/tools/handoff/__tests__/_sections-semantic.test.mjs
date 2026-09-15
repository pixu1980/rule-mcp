

/**
 * The semantic section is the one part of the handoff that only exists when a
 * code graph does, so every arm is a question about absence: no graph, a graph
 * that answered for the commit but not the diff, a shape that does not want
 * the section at all.
 */
import { strict as assert } from "node:assert";
import test from "node:test";

import { semanticLines } from "../_sections-semantic.js";

const FULL = { isMinimal: false, isBrief: false };

test("no graph means no section", () => {
  assert.deepEqual(semanticLines(null, FULL), [], "null is the no-graph answer");
  assert.deepEqual(semanticLines(undefined, FULL), [], "so is undefined");
});

test("the short shapes drop the section even when the graph answered", () => {
  const changes = { commit: { message: "a subject" } };

  assert.deepEqual(semanticLines(changes, { isMinimal: true, isBrief: false }), [], "minimal has no room");
  assert.deepEqual(semanticLines(changes, { isMinimal: false, isBrief: true }), [], "brief has no room either");
});

test("an empty answer still renders the heading, and nothing it cannot say", () => {
  const lines = semanticLines({}, FULL);

  assert.deepEqual(lines, ["### Semantic Changes (TokenSave)", "", ""], "heading, blank, trailing blank");
});

test("a commit with no diff reports its own file count and roles", () => {
  const lines = semanticLines(
    {
      commit: {
        message: "feat(x): do the thing",
        changed_files: ["a.js", "b.js"],
        symbols_by_role: { added: ["f"], removed: ["g"] },
      },
    },
    FULL,
  );

  assert.ok(lines.includes("- Summary: feat(x): do the thing"), "the subject is quoted");
  assert.ok(lines.includes("- Changed files: 2 (added, removed)"), "the roles ride with the count");
});

test("a commit with no roles omits the parenthesis rather than printing an empty one", () => {
  const lines = semanticLines({ commit: { changed_files: ["a.js"] } }, FULL);

  assert.ok(lines.includes("- Changed files: 1"), "no roles, no parenthesis");
  assert.ok(!lines.some((line) => line.includes("()")), "an empty role list is not rendered");
});

test("a diff wins over the commit count, and fills in what it knows", () => {
  const lines = semanticLines(
    {
      commit: { changed_files: ["a.js", "b.js", "c.js"] },
      diff: { changed_files: ["a.js"], modified_symbols: ["f", "g"], impacted_symbols_count: 7, affected_tests: ["t.test.mjs"] },
    },
    FULL,
  );

  assert.ok(lines.includes("- Changed files: 1"), "the diff count replaces the commit one");
  assert.ok(!lines.includes("- Changed files: 3"), "the commit count is not printed as well");
  assert.ok(lines.includes("- Modified symbols: 2"));
  assert.ok(lines.includes("- Impacted symbols: 7"), "the explicit count is used when given");
  assert.ok(lines.includes("- Affected tests: 1"));
});

test("a diff missing every field reports zeros rather than undefined", () => {
  const lines = semanticLines({ diff: {} }, FULL);

  assert.ok(lines.includes("- Changed files: 0"));
  assert.ok(lines.includes("- Modified symbols: 0"));
  assert.ok(lines.includes("- Impacted symbols: 0"));
  assert.ok(lines.includes("- Affected tests: 0"));
});

test("impacted symbols fall back to the list length when there is no count", () => {
  const lines = semanticLines({ diff: { impacted_symbols: ["a", "b", "c"] } }, FULL);

  assert.ok(lines.includes("- Impacted symbols: 3"), "the list is counted when the count is absent");
});

test("history is capped at three events and prefers the short sha", () => {
  const events = [1, 2, 3, 4].map((n) => ({ short_sha: `abcdef${n}`, commit: `abcdef${n}0000000`, summary: `event ${n}` }));
  const lines = semanticLines({ history: { symbol: "doThing", events } }, FULL);

  assert.ok(lines.includes("- History for `doThing`:"));
  assert.equal(lines.filter((line) => line.startsWith("  - ")).length, 3, "the fourth event is not printed");
  assert.ok(lines.includes("  - abcdef1 event 1"), "the short sha is truncated to seven");
});

test("an event with no short sha falls back to the full commit", () => {
  const lines = semanticLines({ history: { symbol: "doThing", events: [{ commit: "0123456789abcdef", summary: "only a commit" }] } }, FULL);

  assert.ok(lines.includes("  - 0123456 only a commit"), "the full sha is truncated the same way");
});

test("an empty history list adds no history lines", () => {
  const lines = semanticLines({ history: { symbol: "doThing", events: [] } }, FULL);

  assert.ok(!lines.some((line) => line.startsWith("- History for")), "nothing to report is not reported");
});
