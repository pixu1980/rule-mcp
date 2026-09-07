/** The corpus claims: measurable savings, data left alone, substance intact, idempotent. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { compressResult, results, text, tokens } from "./_efficacy.fixture.mjs";

test("compression removes something measurable from real tool results", () => {
  const before_ = results.reduce((total, item) => total + tokens(item.core), 0);
  const after = results.reduce((total, item) => total + tokens(item.compressed), 0);
  const saved = before_ - after;

  assert.ok(saved > 0, `the corpus must compress at all (saved ${saved} tokens)`);
  assert.ok(
    saved / before_ > 0.01,
    `compression is a modest saving, but it is a saving: ${saved}/${before_} = ${((saved / before_) * 100).toFixed(1)} %`,
  );
});

test("prose compresses and data is left alone", () => {
  const router = results.find((item) => item.name === "pix_tool");
  assert.equal(
    text(router.compressed),
    text(router.core),
    "the router answers in JSON: compressing it would corrupt the payload",
  );

  const skill = results.find((item) => item.name === "rule_tool_backend_node");
  assert.ok(tokens(skill.compressed) < tokens(skill.core), "a skill body is prose and must lose its filler");
});

test("compression never touches substance", () => {
  const fences = (value) => value.match(/```[\S\s]*?```/g) ?? [];
  const urls = (value) => value.match(/https?:\/\/\S+/g) ?? [];
  const headings = (value) => value.match(/^#{1,6} .*$/gm) ?? [];
  const rows = (value) => value.match(/^\s*\|.*\|\s*$/gm) ?? [];
  const spans = (value) => value.match(/`[^`\n]+`/g) ?? [];

  for (const { name, core, compressed } of results) {
    const source = text(core);
    const output = text(compressed);
    assert.deepEqual(fences(output), fences(source), `${name}: code blocks must survive byte for byte`);
    assert.deepEqual(urls(output), urls(source), `${name}: URLs must survive`);
    assert.deepEqual(headings(output), headings(source), `${name}: headings must survive`);
    assert.deepEqual(rows(output), rows(source), `${name}: table rows must survive`);
    assert.deepEqual(spans(output), spans(source), `${name}: inline code must survive`);
  }
});

test("compressing twice changes nothing the second time", () => {
  for (const { name, compressed } of results) {
    assert.equal(text(compressResult(compressed)), text(compressed), `${name}: compression must be idempotent`);
  }
});
