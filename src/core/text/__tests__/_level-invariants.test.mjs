/**
 * PERF-1 and PERF-2: the invariants every level has to hold, whatever the
 * tables say.
 *
 * A level that changes its own output on a second pass is not a compressor,
 * it is a loop; a level that compresses less than the one below it has its
 * tags wrong; and no level may touch a fence, a URL, a heading or a table row.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { compressText } from "../_compression.js";
import { atLeast, LEVELS } from "../_level.js";

/** One text carrying a construct from every table, plus structure to protect. */
const FIXTURE = [
  "# The heading",
  "",
  "In order to please configure the database, note that quite a few of the",
  "additional parameters are utilized at this time. And therefore the",
  "implementation requires approximately the same configuration.",
  "",
  "- The first item leads to a large number of failures",
  "- See https://example.com/a and ./src/core/text/_compression.js",
  "",
  "```js",
  "const the = 1; // just really actually the code",
  "```",
  "",
  "| Column | The other column |",
  "| --- | --- |",
  "| the value | quite a few |",
].join("\n");

test("each level is idempotent on a text that exercises every table", () => {
  for (const level of LEVELS) {
    const once = compressText(FIXTURE, { level });
    assert.equal(compressText(once, { level }), once, `${level} must be idempotent`);
  }
});

test("off is the identity, and each level compresses at least as hard as the one below", () => {
  assert.equal(compressText(FIXTURE, { level: "off" }), FIXTURE, "off must change nothing");

  let previous = FIXTURE.length;

  for (const level of LEVELS.slice(1)) {
    const length = compressText(FIXTURE, { level }).length;
    assert.ok(length <= previous, `${level} must not be longer than the level below it`);
    previous = length;
  }
});

test("structure survives at every level, code and URLs byte for byte", () => {
  const fences = (value) => value.match(/```[\S\s]*?```/g) ?? [];
  const urls = (value) => value.match(/https?:\/\/\S+/g) ?? [];
  const headings = (value) => value.match(/^#{1,6} .*$/gm) ?? [];
  const rows = (value) => value.match(/^\s*\|.*\|\s*$/gm) ?? [];

  for (const level of LEVELS) {
    const out = compressText(FIXTURE, { level });
    assert.deepEqual(fences(out), fences(FIXTURE), `${level}: code must survive`);
    assert.deepEqual(urls(out), urls(FIXTURE), `${level}: URLs must survive`);
    assert.deepEqual(headings(out), headings(FIXTURE), `${level}: headings must survive`);
    assert.deepEqual(rows(out), rows(FIXTURE), `${level}: table rows must survive`);
  }
});

test("ultra strips conjunctions and abbreviates, full does neither", () => {
  const line = "And therefore the configuration leads to a database request.";

  assert.match(compressText(line, { level: "full" }), /^And so configuration/);
  assert.equal(compressText(line, { level: "ultra" }), "config -> DB req.");
  assert.ok(atLeast("ultra", "full"), "ultra is above full");
});
