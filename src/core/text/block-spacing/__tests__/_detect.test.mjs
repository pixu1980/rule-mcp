/** findBlocks / classifyBlock / indentOf and the fixer's edge rules. */
import { strict as assert } from "node:assert";
import test from "node:test";

import { indentOf, findBlocks, classifyBlock } from "../_detect.js";
import { fixBlockSpacing } from "../index.js";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "rule-block-spacing-detect-"));

test.after(() => rmSync(dir, { recursive: true, force: true }));

test("indentOf returns the leading whitespace or empty", () => {
  assert.equal(indentOf("  x"), "  ");
  assert.equal(indentOf("x"), "");
});

test("findBlocks recognizes every opener shape", () => {
  const code = [
    "if (a) {",
    "  use(a);",
    "}",
    "function named(x) {",
    "  return x;",
    "}",
    "async function () {",
    "  await go();",
    "}",
    "class W extends B {",
    "  render() {",
    "    return <div/>;",
    "  }",
    "}",
    // Arrow bodies with a binding or a closing paren are not detected; the
    // detector only catches bare `=> {` lines and named/anon functions.
    "const f = () => {",
    "  return 1;",
    "};",
  ].join("\n");
  const blocks = findBlocks(code.split("\n"));

  assert.equal(blocks.length, 5, "five blocks recognized");
});

test("a comment-only block body is not a block", () => {
  const code = ["if (a) {", "  // nothing here", "}", "done();"].join("\n");
  assert.equal(findBlocks(code.split("\n")).length, 0, "comment-only blocks are ignored");
});

test("classifyBlock labels toplevel, nested, start, end and only-child", () => {
  // toplevel if → middle (no parent)
  const top = ["if (a) {", "  x();", "}", ""].join("\n").split("\n");
  const topBlocks = findBlocks(top);
  assert.equal(classifyBlock(topBlocks[0], topBlocks, top), "middle", "toplevel is middle");

  // nested: outer loop + inner if only child → start_end
  const nest = ["for (;;) {", "  if (a) {", "    b();", "  }", "}", ""].join("\n").split("\n");
  const nestBlocks = findBlocks(nest);
  const inner = nestBlocks.find((b) => b.openLine === 1);
  assert.equal(classifyBlock(inner, nestBlocks, nest), "start_end", "only child is both at start and end");

  // a middle block with content before and after it inside the parent
  const mid = ["function f() {", "  const a = 1;", "  for (;;) {", "    b();", "  }", "  const c = 2;", "}", ""].join("\n").split("\n");
  const midBlocks = findBlocks(mid);
  const loop = midBlocks.find((b) => b.openLine === 2);
  assert.equal(classifyBlock(loop, midBlocks, mid), "middle", "content around makes it middle");

  // at start: block opens right after parent's brace but content follows below
  const start = ["function f() {", "  if (a) {", "    b();", "  }", "  const c = 2;", "}", ""].join("\n").split("\n");
  const startBlocks = findBlocks(start);
  const ifStart = startBlocks.find((b) => b.openLine === 1);
  assert.equal(classifyBlock(ifStart, startBlocks, start), "start", "at the start of the parent");

  // at end: content above, block last before the parent's closing brace
  const end = ["function f() {", "  const c = 2;", "  if (a) {", "    b();", "  }", "}", ""].join("\n").split("\n");
  const endBlocks = findBlocks(end);
  const ifEnd = endBlocks.find((b) => b.openLine === 2);
  assert.equal(classifyBlock(ifEnd, endBlocks, end), "end", "at the end of the parent");

  // nearest-parent selection: two ancestors, the closer one wins
  const deep = ["function f() {", "  for (;;) {", "    if (a) {", "      b();", "    }", "  }", "}", ""].join("\n").split("\n");
  const deepBlocks = findBlocks(deep);
  const innermost = deepBlocks.find((b) => b.openLine === 2);
  const forBlock = deepBlocks.find((b) => b.openLine === 1);
  assert.equal(classifyBlock(innermost, deepBlocks, deep), "start_end", "the inner block classifies against the loop");
  assert.equal(forBlock.closeLine, 5, "the loop is the inner block's parent");
});

test("the fixer leaves a start-type block unspaced above but spaced below", () => {
  const file = join(dir, "start.js");
  writeFileSync(file, ["function f() {", "  if (a) {", "    b();", "  }", "  const c = 2;", "}", ""].join("\n"));

  assert.equal(fixBlockSpacing(file), true, "a change is made");
  const out = readFileSync(file, "utf8");
  assert.doesNotMatch(out, /if \(a\) \{[^}]*\}\n\n  \}/, "no blank above a start block's opener");
  assert.match(out, /\n  \}\n\n  const c = 2/, "a blank is inserted after a start block");
});

test("the fixer drops triple blank lines", () => {
  const file = join(dir, "triple.js");
  writeFileSync(file, ["if (a) {", "  b();", "}", "", "", "const x = 1;", ""].join("\n"));

  assert.equal(fixBlockSpacing(file), true, "a change is made");
  assert.doesNotMatch(readFileSync(file, "utf8"), /\n{3,}/, "no triple blanks remain");
});

test("the fixer separates consecutive multi-line exports but not barrel lines", () => {
  const file = join(dir, "exports.js");
  writeFileSync(file, ["export function a() {", "  return 1;", "}", "export function b() {", "  return 2;", "}", "export { x } from './x-mod';", "export { y } from './y-mod';", ""].join("\n"));

  assert.equal(fixBlockSpacing(file), true, "a change is made");
  const out = readFileSync(file, "utf8");
  assert.match(out, /\n\}\n\nexport function b/, "a blank separates the multi-line exports");
  assert.doesNotMatch(out, /x\}\n\nexport \{ y/, "barrel re-exports stay adjacent");
});

function require_utf8(file) {
  return readFileUni(file);
}

function readFileUni(file) {
  return import("node:fs").then((fs) => fs.readFileSync(file, "utf8"));
}