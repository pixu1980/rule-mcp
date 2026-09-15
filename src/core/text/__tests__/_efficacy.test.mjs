

/**
 * PERF-6: the floors each level has to clear, measured rather than claimed.
 *
 * The plan asked for 8% at `full` and 20% at `ultra`, or for the targets to be
 * corrected by measurement. Measurement corrected them, and the reason is
 * worth keeping: this repository's skills and docs are already written in the
 * compressed style the compression skill teaches, so on them the vocabulary
 * measures how little filler is left (1.5-2.6%), not what the rules can do. On
 * verbose prose - what an uncompressed assistant answer looks like - the same
 * rules take 17% at `lite`, 34% at `full` and 42% at `ultra`.
 *
 * Both sets of floors are asserted here, with margin under the measured value,
 * so a rule that stops firing is caught and normal drift is not.
 *
 * Run `pnpm report:compression` for the full table.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { VERBOSE_CORPUS } from "../../../../scripts/reports/compression/_verbose.data.mjs";
import { compressTextGuarded } from "../_compression.js";
import { guardCompression } from "../compress-guard/index.js";
import { results, text } from "./_efficacy.fixture.mjs";

/** Percent of characters a level removes from a corpus. */
function savedPercent(corpus, level) {
  const charsIn = corpus.reduce((sum, item) => sum + item.length, 0);
  const charsOut = corpus.reduce((sum, item) => sum + compressTextGuarded(item, { level }).text.length, 0);

  return ((charsIn - charsOut) / charsIn) * 100;
}

const VERBOSE = VERBOSE_CORPUS.map((item) => item.text);
const RESULTS = results.map((item) => text(item.core));

test("the shipped corpus floors: measured 1.52-2.58 %, asserted with margin", () => {
  const floors = { lite: 0.05, full: 1.5, ultra: 1.9 };

  for (const [level, floor] of Object.entries(floors)) {
    const measured = savedPercent(RESULTS, level);
    assert.ok(measured >= floor, `${level} on real tool results: ${measured.toFixed(2)} % < ${floor} % floor`);
  }
});

test("the verbose-prose floors: this is the corpus the level table describes", () => {
  const floors = { lite: 12, full: 28, ultra: 36 };

  for (const [level, floor] of Object.entries(floors)) {
    const measured = savedPercent(VERBOSE, level);
    assert.ok(measured >= floor, `${level} on verbose prose: ${measured.toFixed(2)} % < ${floor} % floor`);
  }
});

test("each level saves strictly more than the one below it", () => {
  const lite = savedPercent(VERBOSE, "lite");
  const full = savedPercent(VERBOSE, "full");
  const ultra = savedPercent(VERBOSE, "ultra");

  assert.ok(full > lite, `full (${full.toFixed(2)} %) must beat lite (${lite.toFixed(2)} %)`);
  assert.ok(ultra > full, `ultra (${ultra.toFixed(2)} %) must beat full (${full.toFixed(2)} %)`);
});

test("no level produces a guard error or a rollback on either corpus", () => {
  for (const level of ["lite", "full", "ultra"]) {
    for (const item of [...VERBOSE, ...RESULTS]) {
      const compressed = compressTextGuarded(item, { level });
      const errors = guardCompression(item, compressed.text).violations.filter((violation) => violation.severity === "error");

      assert.deepEqual(errors, [], `${level}: ${errors.map((error) => error.message).join("; ")}`);
      assert.equal(compressed.rollbacks, 0, `${level}: a rollback means a rule is unsafe on shipped content`);
    }
  }
});
