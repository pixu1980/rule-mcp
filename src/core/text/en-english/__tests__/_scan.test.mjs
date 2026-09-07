/** The English-only scanners: text, code comments, identifiers, paths, docs. */
import { strict as assert } from "node:assert";
import test from "node:test";

import { scanCodeForForeign, scanDocumentForForeign, scanPathForForeign, scanText } from "../_scan.js";

test("scanText finds accents and foreign function words", () => {
  const accented = scanText("caf\u00e9 na\u00efve");
  assert.deepEqual(accented.accented, ["\u00e9"], "the first accented letter is reported");
  assert.deepEqual(accented.foreign, [], "no foreign words here");

  const foreign = scanText("the config invece per"); // invece
  assert.deepEqual(foreign.foreign, ["invece"], "foreign words are collected lowercased");
  assert.deepEqual(scanText("plain english"), { accented: [], foreign: [] }, "plain text stays clean");
});

test("scanCodeForForeign flags accented comments, foreign comments and identifiers", () => {
  const hits = scanCodeForForeign("// caf\u00e9 con crema\nconst invece = 1;\n// we can use resto fine qui\n");
  const kinds = hits.map((h) => h);
  assert.ok(kinds.some((h) => h.includes("accent")), "an accented comment is flagged");
  assert.ok(kinds.some((h) => h.includes("foreign identifier")), "a foreign identifier is flagged");
  assert.equal(scanCodeForForeign("// pure english\nconst name = 1;").length, 0, "english code stays clean");
});

test("scanPathForForeign flags accented and foreign path segments", () => {
  assert.ok(scanPathForForeign("src/componenti/bottone.js").some((h) => h.includes("non-English name")), "foreign segments are flagged");
  assert.ok(scanPathForForeign("src/caf\u00e9.js").some((h) => h.includes("accent")), "accented segments are flagged");
  assert.deepEqual(scanPathForForeign("src/button/index.js"), [], "english paths stay clean");
  assert.deepEqual(scanPathForForeign(""), [], "an empty path is clean");
});

test("scanDocumentForForeign ignores fenced code, inline code and urls", () => {
  const doc = [
    "plain english prose",
    "```js",
    "const x = 'caf\u00e9';",
    "```",
    "see https://example.com/caf\u00e9 for details",
    "il problema \u00e8 che",
  ].join("\n");
  const hits = scanDocumentForForeign(doc);
  assert.equal(hits.length, 1, "only the prose line with accents is flagged");
  assert.match(hits[0], /accent/, "the accent offender is named");
});