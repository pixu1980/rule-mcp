/** The fixer's positional rules: shifting sibling blocks, end blocks, `};`. */
import { strict as assert } from "node:assert";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { fixBlockSpacing } from "../index.js";

const dir = mkdtempSync(join(tmpdir(), "rule-block-spacing-fix-"));

test.after(() => rmSync(dir, { recursive: true, force: true }));

const fix = (name, code) => {
  const file = join(dir, name);
  writeFileSync(file, code);
  const changed = fixBlockSpacing(file);

  return { changed, content: readFileSync(file, "utf8") };
};

test("an inserted blank above a block shifts its siblings", () => {
  const { content } = fix(
    "shift.js",
    [
      "function f() {", // 0
      "  if (x) {", // 1
      "    b();",
      "  }", // 3
      "  const c = 1;",
      "  while (y) {", // 5
      "    d();",
      "  }", // 7
      "}", // 8
      "",
    ].join("\n"),
  );

  // The if block is a middle block: its closing brace gets a blank above it
  // and a blank below, and the while block must still land at the same depth.
  assert.match(content, /\n {2}if \(x\) \{\n/, "the if block still opens on line 1");
  assert.match(content, /\n {2}while \(y\) \{\n\n?/, "the while block still sits after the blank");
  assert.ok(content.split("\n").length >= 10, "insertions never swallow lines");
});

test("an end block gains a blank above but not below", () => {
  const { content } = fix("end.js", ["function f() {", "  const c = 2;", "  if (a) {", "    b();", "  }", "}", ""].join("\n"));

  assert.match(content, /const c = 2;\n\n {2}if \(a\) \{/, "a blank joins the content above the end block");
  assert.doesNotMatch(content, /if \(a\) \{\n {4}b\(\);\n {2}\}\n\n\}/, "no blank between the end block and the parent's brace");
});

test("a line before }; keeps the block rule from double-inserting", () => {
  const { content } = fix("semicolon.js", ["const obj = {", "  run() {", "    go();", "  },", "  stop() {", "    halt();", "  },", "};", ""].join("\n"));

  assert.doesNotMatch(content, /\n{3,}/, "no triple blanks from the object rules");
});

test("a multi-line export followed by a closing brace still separates", () => {
  const { content } = fix("export-next.js", ["export function a() {", "  return 1;", "}", "}", "const x = 1;", ""].join("\n"));

  assert.ok(content.includes("export function a()"), "the export survives");
  assert.ok(content.includes("const x = 1;"), "the trailing statement survives");
});
