/** The CSS extraction helpers: file names, fences, sheets, bare stylesheets. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { extractRealCSS, looksLikeStyling, looksLikeStylesheet, maskLiterals, unjustifiedGrids } from "../_source.js";

test("extractRealCSS trusts a .css file name and collects every embedded form", () => {
  assert.equal(extractRealCSS("a { color: red; }", { fileName: "theme.css" }), "a { color: red; }", "a css file is css whole");

  const mixed = ["```css", "a { color: red; }", "```", "sheet = new CSSStyleSheet(); CSSStyleSheet.replaceSync(`b { margin: 0; }`)", "<style>c { padding: 0; }</style>"].join("\n");
  const extracted = extractRealCSS(mixed);
  assert.match(extracted, /color: red/, "the fenced block extracts");
  assert.match(extracted, /margin: 0/, "the replaceSync sheet extracts");
  assert.match(extracted, /padding: 0/, "the style block extracts");

  assert.equal(extractRealCSS("a { color: red; }"), "a { color: red; }", "a bare stylesheet is recognized as one");
  assert.equal(extractRealCSS("const x = 1;"), "", "a program yields no css");
});

test("looksLikeStylesheet refuses programs and markup", () => {
  assert.equal(looksLikeStylesheet("a { color: red; }"), true, "a rule reads as a stylesheet");
  assert.equal(looksLikeStylesheet("const a = () => ({ color: 1 });"), false, "a program is not a stylesheet");
  assert.equal(looksLikeStylesheet("<div>a { color: red; }</div>"), false, "markup is not a stylesheet");
  assert.equal(looksLikeStylesheet("plain prose"), false, "no rule, no stylesheet");
});

test("unjustifiedGrids flags a bare grid and honors every justification", () => {
  assert.deepEqual(unjustifiedGrids(".bare { display: grid; }"), [".bare"], "a bare grid is an offender");
  assert.deepEqual(unjustifiedGrids("/* grid: named areas */ .stated { display: grid; }"), [], "a stated reason clears it");
  assert.deepEqual(unjustifiedGrids(".areas { display: grid; grid-template-areas: 'a b'; }"), [], "named areas clear it");
  assert.deepEqual(unjustifiedGrids("display: grid;"), [], "a grid outside any rule is not attributable");
});

test("looksLikeStyling and maskLiterals see through quotes", () => {
  assert.equal(looksLikeStyling("uses display: flex here"), true, "a styling marker is seen");
  assert.equal(looksLikeStyling(), false, "nullish input never styles");

  const masked = maskLiterals('const s = "display: flex"; const t = `a\\nb`;');
  assert.doesNotMatch(masked, /display: flex/, "quoted content is masked");
  assert.match(masked, /const s = /, "the code around the strings survives");
});
