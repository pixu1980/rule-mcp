/**
 * @module test/token-pipeline.test.mjs
 *
 * Round-2 token-efficiency pipeline:
 *   - multi-source tokensave detection (explicit dir > env var > cwd > walk-up)
 *   - directive emitted once per process (full first, terse travels with
 *     suppressions), never spammed on every call
 *   - suppression threshold (small blocks pass through untouched)
 *   - compression aggressive pass + runtime byte counters
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = new URL("../../..", import.meta.url).pathname;
const { resolveTokensaveDir, tokensaveActive, suppressIfTokensave, decorateWithTokensave, resetTokenPipeline } = await import(join(BASE, "src/core/agents/_integrations.js"));
const { compressResult, compressText } = await import(join(BASE, "src/core/text/_compression.js"));
const { compressTextAggressive } = await import(join(BASE, "src/core/text/_compression-aggressive.js"));
const { getTokenStats, resetTokenStats } = await import(join(BASE, "src/core/telemetry/_token-stats.js"));

test("multi-source detection: env var wins over a tokensave-less cwd", () => {
  const withTs = mkdtempSync(join(tmpdir(), "pipe-ts-"));
  const without = mkdtempSync(join(tmpdir(), "pipe-nots-"));
  mkdirSync(join(withTs, ".tokensave"), { recursive: true });
  process.env.RULE_MCP_PROJECT_DIR = withTs;
  try {
    assert.equal(tokensaveActive(without), true, "env var must point at the graphed project");
    assert.equal(resolveTokensaveDir(without), withTs);
  } finally {
    delete process.env.RULE_MCP_PROJECT_DIR;
    rmSync(withTs, { recursive: true, force: true });
    rmSync(without, { recursive: true, force: true });
  }
});

test("walk-up: a nested cwd resolves to the parent project's .tokensave", () => {
  const root = mkdtempSync(join(tmpdir(), "pipe-walk-"));
  mkdirSync(join(root, ".tokensave"), { recursive: true });
  const deep = join(root, "a", "b", "c");
  mkdirSync(deep, { recursive: true });
  assert.equal(resolveTokensaveDir(deep), root);
  rmSync(root, { recursive: true, force: true });
});

test("suppression threshold: small blocks pass through untouched", () => {
  const withTs = mkdtempSync(join(tmpdir(), "pipe-th-"));
  mkdirSync(join(withTs, ".tokensave"), { recursive: true });
  try {
    const small = Array.from({ length: 10 }, (_, i) => `line ${i}`).join("\n");
    assert.equal(suppressIfTokensave(small, { projectDir: withTs }), small);
    const big = Array.from({ length: 50 }, (_, i) => `line ${i}`).join("\n");
    const suppressed = suppressIfTokensave(big, { projectDir: withTs });
    assert.match(suppressed, /lines omitted/);
    assert.doesNotMatch(suppressed, /line 49/);
  } finally {
    rmSync(withTs, { recursive: true, force: true });
  }
});

test("directive is emitted once per process (full), then never spammed", () => {
  const withTs = mkdtempSync(join(tmpdir(), "pipe-once-"));
  mkdirSync(join(withTs, ".tokensave"), { recursive: true });

  try {
    resetTokenPipeline();
    const core = { content: [{ type: "text", text: "ok" }] };
    const first = decorateWithTokensave("rule_tool_detect", core, { projectDir: withTs });
    assert.match(first.content[0].text, /TOKENSAVE ACTIVE/);
    const second = decorateWithTokensave("rule_tool_search", { content: [{ type: "text", text: "ok2" }] }, { projectDir: withTs });
    assert.equal(second.content[0].text, "ok2", "no directive spam after the first emission");
  } finally {
    // restore state for other suites running in-process
    resetTokenPipeline();
    rmSync(withTs, { recursive: true, force: true });
  }
});

test("allowlisted heavy outputs are truncated with the terse marker", () => {
  const withTs = mkdtempSync(join(tmpdir(), "pipe-truncate-"));
  mkdirSync(join(withTs, ".tokensave"), { recursive: true });

  try {
    resetTokenPipeline();
    const big = { content: [{ type: "text", text: Array.from({ length: 200 }, (_, i) => `row ${i}`).join("\n") }] };
    const out = decorateWithTokensave("rule_tool_fix", big, { projectDir: withTs });
    const text = out.content.map((c) => c.text).join("\n");
    assert.match(text, /lines omitted - the \.tokensave graph has the detail/);
    assert.match(text, /row 0\b/);
    assert.match(text, /row 199\b/);
    assert.ok(out.content.length >= 2, "directive + truncated body");
    assert.ok(text.length < big.content[0].text.length + 200, "truncated output must be much shorter");
  } finally {
    resetTokenPipeline();
    rmSync(withTs, { recursive: true, force: true });
  }
});

test("phrases and extra fillers are compressed by default", () => {
  // The phrase table moved into the per-line pass (PERF-4: phrases must run
  // before single words), so the default result is what compressText returns.
  const out = compressText("In order to please configure the thing right now. This is literally the whole setup.");
  assert.doesNotMatch(out, /in order to/i);
  assert.doesNotMatch(out, /\bplease\b/i);
  assert.doesNotMatch(out, /right now/i);
  assert.doesNotMatch(out, /\bliterally\b/i);
  assert.match(out, /^To configure thing now\./);
});

test("the aggressive pass is the ultra extra: conjunctions go, and only there", () => {
  const text = "And then the router caches the result.";
  assert.equal(compressTextAggressive(text, { level: "full" }), text, "below ultra it is a no-op");
  assert.equal(compressTextAggressive(text, { level: "ultra" }), "the router caches the result.");
});

test("runtime counters track compression and suppression savings", () => {
  resetTokenStats();
  resetTokenPipeline();
  compressResult({
    content: [{ type: "text", text: "This is really just prose that goes on and on for a while.\n".repeat(5) }],
  });
  const withTs = mkdtempSync(join(tmpdir(), "pipe-cnt-"));
  mkdirSync(join(withTs, ".tokensave"), { recursive: true });
  const big = Array.from({ length: 60 }, (_, i) => `line ${i}`).join("\n");
  suppressIfTokensave(big, { projectDir: withTs });
  rmSync(withTs, { recursive: true, force: true });

  const snap = getTokenStats();
  assert.ok(snap.compressionCalls >= 1, "compression counted");
  assert.ok(snap.compressionSaved >= 0);
  assert.ok(snap.suppressedCalls >= 1, "suppression counted");
  assert.ok(snap.bytesSavedTotal > 0, "total bytes saved must be positive");
  resetTokenStats();
  resetTokenPipeline();
});
