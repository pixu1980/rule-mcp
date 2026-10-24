/** fixBlockSpacing: inserts the blank lines the classification demands, and only those. */
import { strict as assert } from "node:assert";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { fixBlockSpacing, fixBlockSpacingOnFiles } from "../index.js";

const dir = mkdtempSync(join(tmpdir(), "rule-mcp-block-spacing-"));

test.after(() => rmSync(dir, { recursive: true, force: true }));

/** Write a scratch file, fix it, and return { changed, content }. */
function fix(name, code) {
  const file = join(dir, name);
  writeFileSync(file, code);
  const changed = fixBlockSpacing(file);

  return { changed, content: readFileSync(file, "utf8") };
}

test("a block jammed against the previous statement gains a blank line above", () => {
  const { changed, content } = fix("above.js", ["const a = 1;", "if (a) {", "  use(a);", "}", "done(a);", ""].join("\n"));

  assert.equal(changed, true);
  assert.match(content, /const a = 1;\n\nif \(a\) \{/);
});

test("a comment above the block does not force a blank line", () => {
  const { content } = fix("comment.js", ["// the guard", "if (a) {", "  use(a);", "}", "", "done(a);", ""].join("\n"));

  assert.doesNotMatch(content, /\/\/ the guard\n\n/, "a comment binds to the block below it");
});

test("a statement right after the closing brace gains a blank line below", () => {
  const { content } = fix("below.js", ["if (a) {", "  use(a);", "}", "done(a);", ""].join("\n"));

  assert.match(content, /\}\n\ndone\(a\);/);
});

test("else, catch and chained closers stay glued to the brace", () => {
  const source = ["try {", "  work();", "} catch {", "  recover();", "}", "", "if (a) {", "  one();", "} else {", "  two();", "}", ""].join("\n");
  const { content } = fix("closers.js", source);

  assert.match(content, /\} catch \{/, "catch must not be separated from its try");
  assert.match(content, /\} else \{/, "else must not be separated from its if");
});

test("consecutive multi-line exports get a separating blank line, barrels do not", () => {
  const { content } = fix("exports.js", ["export function one() {", "  return 1;", "}", "export function two() {", "  return 2;", "}", ""].join("\n"));

  assert.match(content, /\}\n\nexport function two/);

  // Real sibling specifiers, so the repo-wide import resolver can follow them.
  const barrel = ['export { fixBlockSpacing } from "../_fix.js";', 'export { findBlocks } from "../_detect.js";', ""].join("\n");
  const { changed } = fix("barrel.js", barrel);

  assert.equal(changed, false, "single-line barrel re-exports stay adjacent");
});

test("an already-clean file reports no change and keeps its bytes", () => {
  const clean = ["const a = 1;", "", "if (a) {", "  use(a);", "}", "", "done(a);", ""].join("\n");
  const { changed, content } = fix("clean.js", clean);

  assert.equal(changed, false);
  assert.equal(content, clean);
});

test("triple blank lines collapse to one blank line", () => {
  const { content } = fix("triple.js", ["const a = 1;", "", "", "", "const b = 2;", ""].join("\n"));

  assert.doesNotMatch(content, /\n\n\n/);
});

test("consecutive multi-line exports are separated by a blank line", () => {
  const { changed, content } = fix("exports.js", ["export const a = {", "  x: 1", "}", "export const b = {", "  y: 2", "}", ""].join("\n"));

  assert.equal(changed, true, "the missing separator is inserted");
  assert.ok(content.includes("}\n\nexport const b"), "the blank line lands between the bodies");
});

test("fixBlockSpacingOnFiles counts changed files and skips unreadable ones", () => {
  const changed = join(dir, "multi-changed.js");
  writeFileSync(changed, ["if (a) {", "  use(a);", "}", "done(a);", ""].join("\n"));
  const clean = join(dir, "multi-clean.js");
  writeFileSync(clean, "const a = 1;\n");

  const count = fixBlockSpacingOnFiles([changed, clean, join(dir, "missing.js")]);

  assert.equal(count, 1, "one file changed, one was clean, one could not be read");
});
