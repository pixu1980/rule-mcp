/**
 * @module test/wcag-data.test
 *
 * The vendored WCAG 2.2 criteria are the deterministic core of the a11y report.
 * The data module is a foundation: the report, the CLI and the updater all read
 * from here, so the shape is pinned before anything builds on it.
 */

import test from "node:test";
import assert from "node:assert/strict";

const { CRITERIA, EARL_OUTCOMES, WCAG_EM_STEPS, WCAG_GENERATED, WCAG_SOURCE, WCAG_VERSION, criteriaForLevel, criterion } = await import("../../../../src/core/wcag-data/index.js");

test("the data is pinned to WCAG 2.2", () => {
  assert.equal(WCAG_VERSION, "2.2");
  assert.match(WCAG_SOURCE, /^https:\/\/www\.w3\.org\//);
  assert.match(WCAG_GENERATED, /^\d{4}-\d{2}-\d{2}$/);
});

test("every criterion has the five WCAG-EM fields", () => {
  const rows = Object.values(CRITERIA);
  assert.ok(rows.length >= 80, `expected the full criterion table, got ${rows.length}`);
  for (const row of rows) {
    for (const key of ["num", "id", "handle", "level", "guideline", "principle"]) {
      assert.ok(typeof row[key] === "string" && row[key].length > 0, `missing ${key} in ${row.num}`);
    }
    assert.ok(["A", "AA", "AAA"].includes(row.level), `unknown level in ${row.num}`);
  }
});

test("criterion() resolves by number", () => {
  assert.equal(criterion("1.4.3").id, "contrast-minimum");
  assert.equal(criterion("4.1.2").id, "name-role-value");
  assert.equal(criterion("9.9.9"), undefined);
});

test("criteriaForLevel AA returns A and AA but not AAA", () => {
  const rows = criteriaForLevel("AA");
  const levels = new Set(rows.map((row) => row.level));
  assert.deepEqual([...levels].sort(), ["A", "AA"]);
  assert.ok(criteriaForLevel("A").every((row) => row.level === "A"));
  assert.ok(criteriaForLevel("AAA").some((row) => row.level === "AAA"));
});

test("the EARL outcome vocabulary and the EM steps are stable", () => {
  assert.deepEqual(EARL_OUTCOMES, ["passed", "failed", "cantTell", "inapplicable", "untested"]);
  assert.equal(WCAG_EM_STEPS.length, 5);
  assert.equal(WCAG_EM_STEPS.at(-1).step, 5);
  assert.equal(WCAG_EM_STEPS.at(-1).name, "Report the findings");
});
