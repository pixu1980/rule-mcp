

/** Branch coverage for the write guard: locale skip, compose fallback, report arms. */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { adviseWrite, LOCALE_FILE } from "../_write.js";
import { composeFile, writeGuardrailReport } from "../_write-check.js";

test("locale files are skipped before any read", async () => {
  assert.match("src/locales/it.json", LOCALE_FILE);
  assert.deepEqual(await adviseWrite({ file_path: "src/locales/it.json" }), { advice: "" });
});

test("composeFile prefers disk and falls back to the payload", () => {
  const dir = mkdtempSync(join(tmpdir(), "rule-write-branches-"));
  const empty = join(dir, "empty.js");
  writeFileSync(empty, "");
  try {
    assert.equal(composeFile({ file_path: empty, content: "const x = 1;\n" }), "const x = 1;\n");
    assert.equal(composeFile({ file_path: join(dir, "missing.js"), content: "y" }), "y");
    assert.equal(composeFile({ file_path: join(dir, "missing.js") }), "");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("non-checkable paths and missing files report nothing", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rule-write-branches-"));
  try {
    assert.deepEqual(await writeGuardrailReport({ file_path: join(dir, "README.md") }), { report: "" });
    assert.deepEqual(await writeGuardrailReport({ file_path: join(dir, "missing.js") }), { report: "" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a clean file reports nothing", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rule-write-branches-"));
  const file = join(dir, "clean.js");

  try {
    assert.deepEqual(await writeGuardrailReport({ file_path: file }), { report: "" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("adviseWrite combines the language report with the guardrail report", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rule-write-branches-"));
  const file = join(dir, "bad.js");
  writeFileSync(file, "// colour and \u201cquotes\u201d\nconst x = 1;\n");
  try {
    const result = await adviseWrite({ file_path: file, content: "// colour and \u201cquotes\u201d\nconst x = 1;\n" });

    assert.match(result.advice, /British|em\/en dash|curly quote/u);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
