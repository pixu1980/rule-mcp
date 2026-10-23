/**
 * @module tests/docs/quick-start
 *
 * Chapter 07 is the shallow entry: a reader can use the server without reading
 * the engineering guides. It has to cover every flow the handbook promises, and
 * the deep guide stays one link away.
 */

import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const DOCS = new URL("../../docs/", import.meta.url).pathname;
const QUICK = join(DOCS, "07-quick-start.md");

test("the quick-start is chapter 07", () => {
  assert.ok(existsSync(QUICK), "docs/07-quick-start.md must exist");
  assert.match(readFileSync(QUICK, "utf8"), /^# /m, "the chapter needs a heading");
});

test("the quick-start covers every flow the handbook promises", () => {
  const text = readFileSync(QUICK, "utf8").toLowerCase();

  for (const flow of ["init", "check", "fix", "handoff", "handon", "persona", "cache", "decision"]) {
    assert.ok(text.includes(flow), `the quick-start must cover ${flow}`);
  }
});

test("the quick-start links to the deep engineering guides", () => {
  const text = readFileSync(QUICK, "utf8");

  assert.match(text, /\]\(\.\/08-engineering-guides\.md\)/u, "the deep guide is one link away");
});

test("the handbook index lists the quick-start", () => {
  const index = readFileSync(join(DOCS, "README.md"), "utf8");

  assert.match(index, /07-quick-start\.md/u, "docs/README.md must link chapter 07");
});
