// test/gateway-receipt-paths.test.mjs
//
// Audit finding 02 — the gateway receipt proved "these bytes passed the
// guardrails" and nothing about where they would land, so a receipt earned for
// benign content authorised a write to any path under the project root.
//
// The fix adds a second, path-bound binding: issueFilesReceipt() signs the
// ordered (path, contentHash) tuple list. Two rules carry the weight:
//
//   * a path-bound receipt must reject a different path for the same content;
//   * the two binding kinds must not be interchangeable — a content-only
//     receipt must never validate a multi-file write, and a path-bound receipt
//     must never validate through the legacy content-only route (otherwise the
//     caller just picks the weaker check).
//
// The legacy single-file flow (gateway receives `code`, apply writes one file)
// keeps working: that is the back-compat contract.

import test from "node:test";
import assert from "node:assert/strict";

import { issueReceipt, issueFilesReceipt, validateReceipt, validateApply } from "../src/tools/gateway.js";

const T0 = 2_000_000; // injected clock (ms)
const TTL = 300_000;
const SKILL = "rule-frontend-react";

// ── Path-bound receipts ────────────────────────────────────────────────────

test("a path-bound receipt validates the exact files it was issued for", () => {
  const files = [{ path: "src/a.js", content: "const a = 1;" }];
  const token = issueFilesReceipt(files, SKILL, true, T0);
  const result = validateApply(token, files, T0);
  assert.equal(result.valid, true);
  assert.equal(result.binding, "files");
});

test("a path-bound receipt rejects the same content at a different path", () => {
  const files = [{ path: "src/a.js", content: "const a = 1;" }];
  const token = issueFilesReceipt(files, SKILL, true, T0);
  const moved = [{ path: ".git/hooks/pre-commit", content: "const a = 1;" }];
  const result = validateApply(token, moved, T0);
  assert.equal(result.valid, false);
  assert.match(result.reason, /path|file/i);
});

test("a path-bound receipt rejects an extra file smuggled into the write", () => {
  const files = [{ path: "src/a.js", content: "const a = 1;" }];
  const token = issueFilesReceipt(files, SKILL, true, T0);
  const extra = [...files, { path: "src/b.js", content: "const b = 2;" }];
  assert.equal(validateApply(token, extra, T0).valid, false);
});

test("a path-bound receipt rejects reordered files", () => {
  const files = [
    { path: "src/a.js", content: "const a = 1;" },
    { path: "src/b.js", content: "const b = 2;" },
  ];
  const token = issueFilesReceipt(files, SKILL, true, T0);
  assert.equal(validateApply(token, [files[1], files[0]], T0).valid, false);
});

test("a path-bound receipt rejects modified content", () => {
  const files = [{ path: "src/a.js", content: "const a = 1;" }];
  const token = issueFilesReceipt(files, SKILL, true, T0);
  assert.equal(validateApply(token, [{ path: "src/a.js", content: "const a = 2;" }], T0).valid, false);
});

test("a path-bound receipt is refused when guardrails did not pass", () => {
  const files = [{ path: "src/a.js", content: "bad" }];
  const token = issueFilesReceipt(files, SKILL, false, T0);
  const result = validateApply(token, files, T0);
  assert.equal(result.valid, false);
  assert.match(result.reason, /guardrail/i);
});

test("a path-bound receipt expires with the same TTL as a content receipt", () => {
  const files = [{ path: "src/a.js", content: "const a = 1;" }];
  const token = issueFilesReceipt(files, SKILL, true, T0);
  assert.equal(validateApply(token, files, T0 + TTL - 1).valid, true);
  const expired = validateApply(token, files, T0 + TTL + 1);
  assert.equal(expired.valid, false);
  assert.match(expired.reason, /expired/i);
});

// ── The two bindings must not be interchangeable ───────────────────────────

test("validateReceipt refuses a path-bound token (no downgrade to content-only)", () => {
  const files = [{ path: "src/a.js", content: "const a = 1;" }];
  const token = issueFilesReceipt(files, SKILL, true, T0);
  const result = validateReceipt(token, "const a = 1;", T0);
  assert.equal(result.valid, false);
  assert.match(result.reason, /path-bound|binding/i);
});

test("a content-only receipt still authorises the legacy single-file write", () => {
  const code = "const legacy = 1;";
  const token = issueReceipt(code, SKILL, true, T0);
  const result = validateApply(token, [{ path: "src/legacy.js", content: code }], T0);
  assert.equal(result.valid, true);
  assert.equal(result.binding, "content");
});

test("a content-only receipt cannot authorise a multi-file write", () => {
  // The old code concatenated contents with "\n---FILE---\n", so a receipt for
  // that concatenation validated an arbitrary set of files. Multi-file writes
  // now require the path-bound flow.
  const code = "A\n---FILE---\nB";
  const token = issueReceipt(code, SKILL, true, T0);
  const result = validateApply(
    token,
    [
      { path: "src/a.js", content: "A" },
      { path: "src/b.js", content: "B" },
    ],
    T0,
  );
  assert.equal(result.valid, false);
  assert.match(result.reason, /path-bound|multi/i);
});

test("an unknown token is refused", () => {
  const result = validateApply("deadbeef", [{ path: "a.js", content: "x" }], T0);
  assert.equal(result.valid, false);
});

test("validateApply refuses an empty file list", () => {
  const token = issueFilesReceipt([{ path: "a.js", content: "x" }], SKILL, true, T0);
  assert.equal(validateApply(token, [], T0).valid, false);
});
