/** Branch coverage for the installer path helpers' quiet catch arms. */
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { atomicWrite, backupFile, readText, removeFile } from "../_paths.js";

test("readText returns empty for a missing file", () => {
  assert.equal(readText(join(tmpdir(), "rule-mcp-paths-missing-" + Date.now())), "");
});

test("removeFile is a no-op when the path is absent", () => {
  assert.doesNotThrow(() => removeFile(join(tmpdir(), "rule-mcp-paths-absent-" + Date.now())));
});

test("atomicWrite creates the parent directory and replaces an existing file", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-paths-branches-"));
  const file = join(root, "nested", "out.json");

  mkdirSync(join(root, "nested"), { recursive: true });
  writeFileSync(file, "old");

  const out = atomicWrite({ file, content: "new" });

  assert.equal(out, file);
  assert.equal(readText(file), "new");
  assert.equal(readText(`${file}.bak`), "old");
});

test("backupFile returns null when the source cannot be read", { skip: process.platform === "win32" }, () => {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-paths-branches-"));
  const file = join(root, "locked.txt");

  writeFileSync(file, "x");
  chmodSync(file, 0);

  try {
    assert.equal(backupFile(file), null);
  } finally {
    chmodSync(file, 0o644);
  }
});
