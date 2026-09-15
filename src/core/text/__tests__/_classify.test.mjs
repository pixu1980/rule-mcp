

/**
 * classifyText and its two content heuristics: what the compressor may touch
 * and what it must leave alone.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { classifyText, looksLikeJson, looksLikeYaml } from "../_classify.js";

test("looksLikeJson accepts only text that parses as an object or array", () => {
  assert.equal(looksLikeJson('{"a":1}'), true);
  assert.equal(looksLikeJson("  [1, 2, 3]  "), true, "leading space does not hide a document");
  assert.equal(looksLikeJson("{not json}"), false, "the opening brace is not enough");
  assert.equal(looksLikeJson('"a string"'), false, "a bare scalar is not a document");
  assert.equal(looksLikeJson("# a heading"), false);
  assert.equal(looksLikeJson(""), false);
});

test("looksLikeYaml needs most of the head to read as yaml", () => {
  assert.equal(looksLikeYaml(["---", "name: probe", "version: 1"]), true, "a front-matter block is yaml");
  assert.equal(looksLikeYaml(["items:", "- name: one", "- name: two"]), true, "a list of mappings is yaml");
  assert.equal(looksLikeYaml(["This is a sentence.", "And another one.", "key: value"]), false, "one key in prose is not yaml");
  assert.equal(looksLikeYaml([]), false, "nothing is not yaml");
  assert.equal(looksLikeYaml(["", " ".repeat(3), ""]), false, "blank lines are not yaml");
});

test("looksLikeYaml only reads the first thirty lines", () => {
  const prose = Array.from({ length: 30 }, () => "This is an ordinary sentence.");

  assert.equal(looksLikeYaml([...prose, "key: value", "other: value"]), false, "yaml after the window does not flip the verdict");
});

test("a known prose extension is natural language whatever it holds", () => {
  for (const name of ["README.md", "notes.txt", "guide.markdown", "doc.rst"]) {
    assert.equal(classifyText("const x = 1;", name), "natural_language", `${name}: the extension decides`);
  }
});

test("a known source extension is code, and a known config extension is config", () => {
  assert.equal(classifyText("anything", "index.js"), "code");
  assert.equal(classifyText("anything", "main.py"), "code");
  assert.equal(classifyText("anything", "styles.css"), "code");

  assert.equal(classifyText("anything", "package.json"), "config");
  assert.equal(classifyText("anything", "compose.yaml"), "config");
  assert.equal(classifyText("anything", ".env"), "config", "a dotfile extension still classifies");
});

test("an extension nobody listed is unknown, whatever the content", () => {
  assert.equal(classifyText("Just a sentence.", "archive.tar"), "unknown");
  assert.equal(classifyText("{}", "data.bin"), "unknown", "the content is not consulted once an extension is known to be unlisted");
});

test("the extension match is case-insensitive", () => {
  assert.equal(classifyText("x", "README.MD"), "natural_language");
  assert.equal(classifyText("x", "Index.JS"), "code");
});

test("with no file name the content decides", () => {
  assert.equal(classifyText('{"a": 1}'), "config", "json content is config");
  assert.equal(classifyText("---\nname: probe\nversion: 1"), "config", "yaml content is config");
  assert.equal(classifyText("function probe() {\n  return 1;\n}\nconst x = probe();"), "code", "mostly code lines are code");
  assert.equal(classifyText("This is a paragraph of prose.\nIt runs to a second line."), "natural_language");
  assert.equal(classifyText(""), "natural_language", "nothing to judge is left compressible");
});

test("a file name with no extension falls through to the content", () => {
  assert.equal(classifyText('{"a": 1}', "LICENSE"), "config", "no extension means the content is read");
  assert.equal(classifyText("Some prose here.", "Makefile"), "natural_language");
});
