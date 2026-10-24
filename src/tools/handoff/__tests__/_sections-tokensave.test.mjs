/**
 * The two TokenSave sections of a handoff, and their silence.
 *
 * A handoff without a graph must read exactly as it did before these sections
 * existed: no heading, no empty list, no apology.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { affectedTestLines, recallLines } from "../_sections-tokensave.js";

const full = { isMinimal: false, isBrief: false };
const brief = { isMinimal: false, isBrief: true };
const minimal = { isMinimal: true, isBrief: false };

test("no recalled decisions means no section", () => {
  assert.deepEqual(recallLines(null, full), []);
  assert.deepEqual(recallLines({ decisions: [] }, full), []);
  assert.deepEqual(recallLines({ decisions: [{ text: " ".repeat(3) }] }, full), []);
});

test("a decision carries its reason, and a long one is cut", () => {
  const lines = recallLines({ decisions: [{ text: "Use exact pins", reason: "a range hides a decision" }] }, full);

  assert.match(lines.join("\n"), /### Decisions on record/);
  assert.ok(lines.includes("- Use exact pins - a range hides a decision"));

  const long = recallLines({ decisions: [{ text: "X", reason: "y".repeat(400) }] }, full).join("\n");

  assert.ok(long.length < 400, "the reason is truncated so one decision cannot eat the budget");
});

test("a brief handoff carries fewer decisions than a full one", () => {
  const decisions = Array.from({ length: 10 }, (_unused, index) => ({ text: `decision ${index}` }));
  const fullLines = recallLines({ decisions }, full).filter((line) => line.startsWith("- "));
  const briefLines = recallLines({ decisions }, brief).filter((line) => line.startsWith("- "));

  assert.equal(fullLines.length, 8);
  assert.equal(briefLines.length, 3);
});

test("a minimal handoff carries neither section", () => {
  assert.deepEqual(recallLines({ decisions: [{ text: "x" }] }, minimal), []);
  assert.deepEqual(affectedTestLines({ tests: ["a.test.js"] }, minimal), []);
});

test("affected tests are listed, and the rest are counted", () => {
  const tests = Array.from({ length: 20 }, (_unused, index) => `src/__tests__/${index}.test.js`);
  const lines = affectedTestLines({ tests }, brief);

  assert.match(lines.join("\n"), /### Tests Reached by These Changes/);
  assert.match(lines.join("\n"), /and 14 more/, "the remainder is a number, not a wall of paths");
});

test("no affected tests means no section", () => {
  assert.deepEqual(affectedTestLines(null, full), []);
  assert.deepEqual(affectedTestLines({ tests: [] }, full), []);
});
