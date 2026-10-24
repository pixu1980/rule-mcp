

/** Branch coverage for the handoff sources: default status and non-markdown context. */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { readAdrs, readContextValues } from "../_sources.js";

test("an ADR without a status line defaults to proposed", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-sources-branches-"));

  mkdirSync(join(root, "docs", "adr"), { recursive: true });
  writeFileSync(join(root, "docs", "adr", "001-no-status.md"), "# 001: No status\n\nA body without a status line.\n");

  const [adr] = readAdrs(root);

  assert.equal(adr.status, "proposed");
  assert.equal(adr.date, "");
});

test("a non-markdown context file is skipped", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-sources-branches-"));

  mkdirSync(join(root, ".context"), { recursive: true });
  writeFileSync(join(root, ".context", "notes.txt"), "**Ignored**: yes\n");
  writeFileSync(join(root, ".context", "one.md"), "**Kept**: yes\n- **Second**: yes\n");

  assert.deepEqual(readContextValues(root), { Kept: "yes", Second: "yes" });
});
