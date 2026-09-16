

/** The English-only scanners: text, code comments, identifiers, paths, docs. */
import { strict as assert } from "node:assert";
import test from "node:test";

import { scanCodeForForeign, scanDocumentForForeign, scanPathForForeign, scanText } from "../_scan.js";

test("scanText finds accents and foreign function words", () => {
  const accented = scanText("caf\u00E9 na\u00EFve");
  assert.deepEqual(accented.accented, ["\u00E9"], "the first accented letter is reported");
  assert.deepEqual(accented.foreign, [], "no foreign words here");

  const foreign = scanText("the config invece per"); // invece
  assert.deepEqual(foreign.foreign, ["invece"], "foreign words are collected lowercased");
  assert.deepEqual(scanText("plain english"), { accented: [], foreign: [] }, "plain text stays clean");
});

test("scanText keeps acronyms out of the foreign words", () => {
  assert.deepEqual(scanText("released under the MIT license").foreign, [], "an acronym is not German prose");
  assert.deepEqual(scanText("MIT and TIM both appear").foreign, [], "every acronym stays clean");
  assert.deepEqual(scanText("mit dem Auto").foreign, ["mit"], "the lower-case word is still caught");
});

test("scanCodeForForeign flags accented comments, foreign comments and identifiers", () => {
  const hits = scanCodeForForeign("// caf\u00E9 con crema\nconst invece = 1;\n// we can use resto fine qui\n");
  const kinds = hits.map((h) => h);
  assert.ok(
    kinds.some((h) => h.includes("accent")),
    "an accented comment is flagged",
  );
  assert.ok(
    kinds.some((h) => h.includes("foreign identifier")),
    "a foreign identifier is flagged",
  );
  assert.equal(scanCodeForForeign("// pure english\nconst name = 1;").length, 0, "english code stays clean");
});

test("scanPathForForeign flags accented and foreign path segments", () => {
  assert.ok(
    scanPathForForeign("src/componenti/bottone.js").some((h) => h.includes("non-English name")),
    "foreign segments are flagged",
  );
  assert.ok(
    scanPathForForeign("src/caf\u00E9.js").some((h) => h.includes("accent")),
    "accented segments are flagged",
  );
  assert.deepEqual(scanPathForForeign("src/button/index.js"), [], "english paths stay clean");
  assert.deepEqual(scanPathForForeign(""), [], "an empty path is clean");
});

test("scanDocumentForForeign ignores fenced code, inline code and urls", () => {
  const doc = ["plain english prose", "```js", "const x = 'caf\u00E9';", "```", "see https://example.com/caf\u00E9 for details", "il problema \u00E8 che"].join("\n");
  const hits = scanDocumentForForeign(doc);
  assert.equal(hits.length, 1, "only the prose line with accents is flagged");
  assert.match(hits[0], /accent/, "the accent offender is named");
});

test("scanDocumentForForeign ignores e-mail addresses", () => {
  // The domain suffix is a Portuguese function word, so an unsplit author
  // address failed every ADR rule_tool_process_adr generated.
  assert.deepEqual(scanDocumentForForeign("- **Author**: Emiliano Pisu <emiliano.pisu@webidoo.com>"), [], "an address is an identifier, not prose");
  assert.deepEqual(scanDocumentForForeign("Contact first.last@example.co.uk today"), [], "a long address is stripped whole");
});
