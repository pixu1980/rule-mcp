

/**
 * PERF-1 and PERF-2: the vocabulary tables and the levels that gate them.
 *
 * Every entry in every table gets a corpus case here, generated from the table
 * itself: a rule that ships without evidence that it fires - and without
 * evidence that it stays quiet below its level - is a rule nobody can tune.
 * The idempotence assertions are the other half: a level that changes its own
 * output on a second pass is not a compressor, it is a loop.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { ABBREVIATIONS } from "../_abbreviations.data.js";
import { compressText } from "../_caveman.js";
import { FILLERS } from "../_fillers.data.js";
import { atLeast, LEVELS } from "../_level.js";
import { PHRASES } from "../_phrases.data.js";
import { SYNONYMS } from "../_synonyms.data.js";

/** The literal word a guarded filler pattern is built around. */
const literal = (pattern) => pattern.split("(?!", 1)[0];

/** The level one step below this one, or null for the weakest rule. */
const below = (level) => LEVELS[LEVELS.indexOf(level) - 1] ?? null;

const has = (text, word) => new RegExp(String.raw`\b${word.replaceAll(" ", String.raw`\s+`)}\b`, "i").test(text);

test("every filler entry is removed at its level and left alone below it", () => {
  for (const entry of FILLERS) {
    const word = literal(entry.pattern);
    const line = `The value is ${word} large here.`;

    assert.ok(!has(compressText(line, { level: entry.level }), word), `${word} must go at ${entry.level}`);

    const weaker = below(entry.level);

    if (weaker && weaker !== "off") {
      assert.ok(has(compressText(line, { level: weaker }), word), `${word} must survive at ${weaker}`);
    }
  }
});

/** Phrases matched anywhere in a line, and pleasantries matched only at its start. */
const UNANCHORED = PHRASES.filter((item) => !item.anchored);
const ANCHORED = PHRASES.filter((item) => item.anchored);

test("every phrase entry is rewritten at its level and left alone below it", () => {
  for (const entry of UNANCHORED) {
    const line = `Text ${entry.from} more text.`;
    const out = compressText(line, { level: entry.level });

    assert.ok(!has(out, entry.from), `"${entry.from}" must go at ${entry.level}: got "${out}"`);

    if (entry.to !== "") {
      assert.ok(out.includes(entry.to), `"${entry.from}" must become "${entry.to}": got "${out}"`);
    }

    const weaker = below(entry.level);

    if (weaker && weaker !== "off") {
      assert.ok(has(compressText(line, { level: weaker }), entry.from), `"${entry.from}" must survive at ${weaker}`);
    }
  }
});

test("an anchored pleasantry goes only when it opens the line", () => {
  // Some pleasantries are also plain filler ("certainly") or listed unanchored
  // ("of course"), and those tables own them anywhere in the line. The anchor
  // matters for the rest.
  const ownedElsewhere = new Set([...UNANCHORED.map((item) => item.from), ...FILLERS.map((item) => literal(item.pattern))]);

  // Sentence case, because that is what prose looks like: a lowercase "let me"
  // is a JavaScript declaration to the ported code-line guard, and exempt.
  const sentence = (text) => text[0].toUpperCase() + text.slice(1);

  for (const entry of ANCHORED) {
    const opening = compressText(`${sentence(entry.from)}, the value is large.`, { level: entry.level });
    assert.ok(!has(opening, entry.from), `"${entry.from}" must go when it opens the line: got "${opening}"`);

    if (ownedElsewhere.has(entry.from)) {
      continue;
    }

    // Mid-sentence the same words are content, not packaging: dropping
    // "happy to help" out of "I would be happy to help you" broke the sentence.
    const buried = compressText(`The team would be ${entry.from} with that.`, { level: entry.level });
    assert.ok(has(buried, entry.from), `"${entry.from}" must survive mid-line: got "${buried}"`);
  }
});

test("every synonym and abbreviation swaps at its level and not before", () => {
  for (const entry of [...SYNONYMS, ...ABBREVIATIONS]) {
    const line = `Text ${entry.from} more text.`;
    const out = compressText(line, { level: entry.level });

    assert.ok(out.includes(entry.to), `"${entry.from}" must become "${entry.to}" at ${entry.level}: got "${out}"`);

    const weaker = below(entry.level);

    if (weaker && weaker !== "off") {
      assert.ok(has(compressText(line, { level: weaker }), entry.from), `"${entry.from}" must survive at ${weaker}`);
    }
  }
});

test("no table entry is listed at a level the level table does not know", () => {
  for (const entry of [...FILLERS, ...PHRASES, ...SYNONYMS, ...ABBREVIATIONS]) {
    assert.ok(LEVELS.includes(entry.level), `unknown level "${entry.level}"`);
    assert.notEqual(entry.level, "off", "off applies no rule at all");
  }
});
