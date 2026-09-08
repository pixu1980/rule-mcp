/**
 * @module tests/docs/docs-handbook-numbering
 *
 * The handbook is numbered `01` upward with no gap and no repeat.
 *
 * A number in a filename is an alias nothing validates, so a chapter removed
 * or a generated document inserted leaves a hole that every later reference
 * then has to remember. The census owns the numbers from `06` up and a person
 * owns the ones below it, which is exactly the seam where the two halves can
 * drift apart without either noticing.
 */

import { strict as assert } from "node:assert";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { GENERATED_DOCS } from "../../scripts/reports/census/_docs.mjs";

const DOCS = new URL("../../docs/", import.meta.url).pathname;

/** Every numbered chapter, in the order the numbers put them. */
const numbered = readdirSync(DOCS)
  .filter((name) => /^\d{2}-.+\.md$/.test(name))
  .sort((a, b) => a.localeCompare(b));

test("the handbook numbering is a gapless sequence from 01", () => {
  const expected = numbered.map((_, index) => String(index + 1).padStart(2, "0"));

  assert.deepEqual(
    numbered.map((name) => name.slice(0, 2)),
    expected,
    `docs/ numbering has a hole or a repeat: ${numbered.join(", ")}`,
  );
});

test("the generated documents are the tail of the sequence", () => {
  const generated = GENERATED_DOCS.map((doc) => doc.file);

  assert.deepEqual(numbered.slice(-generated.length), generated, "the census writes documents that are not the last chapters of the handbook");
});

test("every chapter is listed in the handbook index", () => {
  const index = readFileSync(join(DOCS, "README.md"), "utf8");
  const unlisted = numbered.filter((name) => !index.includes(name));

  assert.deepEqual(unlisted, [], "chapters missing from the table in docs/README.md");
});
