/**
 * @module test/handoff/refresh
 *
 * The refresher rewrites a HANDOFF.md that is already there and never creates
 * one, so a project that does not keep the file is untouched.
 */
import { strict as assert } from "node:assert";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { HANDOFF_FILE, regenerateHandoffFile } from "../_refresh.js";

test("regenerateHandoffFile rewrites an existing HANDOFF.md", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-refresh-"));

  try {
    writeFileSync(join(root, HANDOFF_FILE), "old");

    const file = regenerateHandoffFile(root, { build: () => ({ text: "new" }) });

    assert.equal(file, join(root, HANDOFF_FILE));
    assert.equal(readFileSync(join(root, HANDOFF_FILE), "utf8"), "new");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("regenerateHandoffFile creates nothing", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-refresh-"));

  try {
    assert.equal(regenerateHandoffFile(root, { build: () => ({ text: "new" }) }), null);
    assert.equal(existsSync(join(root, HANDOFF_FILE)), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
