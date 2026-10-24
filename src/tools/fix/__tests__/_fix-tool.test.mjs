/** rule_tool_fix: the deterministic guardrail passes, previewed then applied. */
import { strict as assert } from "node:assert";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { callTool } from "../../router/index.js";
import { registerFixTool } from "../index.js";

registerFixTool();

const text = (result) => result.content.map((part) => part.text).join("\n");

test("lint previews the deterministic changes without writing", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rule-fix-tool-"));
  const file = join(dir, "demo.js");
  const before = "export function value() {\n  const x = 1;\n  return x;\n}\n";
  writeFileSync(file, before);

  try {
    const result = await callTool("rule_tool_fix", { files: [file], mode: "lint" });

    assert.match(text(result), /Would fix 1\/1 file\(s\)/, "the report counts what it would change");
    assert.equal(readFileSync(file, "utf8"), before, "lint writes nothing");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("fix applies the passes and leaves a compliant file alone", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rule-fix-tool-"));
  const file = join(dir, "demo.js");
  writeFileSync(file, "export function value() {\n  const x = 1;\n  return x;\n}\n");

  try {
    const fixed = await callTool("rule_tool_fix", { files: [file], mode: "fix" });

    assert.match(text(fixed), /Fixed 1\/1 file\(s\)/, "the file was fixed");
    assert.match(readFileSync(file, "utf8"), /\n\n {2}return x;/, "the blank line before return landed");

    const again = await callTool("rule_tool_fix", { files: [file], mode: "fix" });

    assert.match(text(again), /Fixed 0\/1 file\(s\)/, "a second run finds nothing to fix");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a prose file loses its typographic characters", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rule-fix-tool-"));
  const file = join(dir, "doc.md");
  writeFileSync(file, "A \u201Cquoted\u201D word and a color.\n");

  try {
    const result = await callTool("rule_tool_fix", { files: [file], mode: "fix" });

    assert.match(text(result), /Fixed 1\/1 file\(s\)/, "the prose file was fixed");
    const after = readFileSync(file, "utf8");

    assert.ok(!after.includes("\u201C"), "curly quotes are gone");
    assert.match(after, /color/, "British spelling is americanized");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an empty scope is reported, not an error", async () => {
  const result = await callTool("rule_tool_fix", { files: ["/nonexistent/nowhere.js"], mode: "lint" });

  assert.match(text(result), /No fixable files in scope/);
});
