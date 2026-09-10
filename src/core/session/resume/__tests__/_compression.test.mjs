

/**
 * ITEM 1 (plan: execution-plan.md) — the handoff block injected by the resume
 * hook is prose the model pays for, exactly like a tool result, but it never
 * went through the compressor: `handoffBlock`/`resumeContext` handed the raw
 * handon report to the SessionStart hook's `additionalContext`.
 *
 * This pins that the injected block now runs through the caveman pipeline, that
 * the structural guard holds on it (headings, inline code, the file name, the
 * claim headings), and that it books its own telemetry source so coverage is
 * answerable. The opt-outs must keep working.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strict as assert } from "node:assert";
import { test } from "node:test";

process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-resume-compression-"));
process.env.RULE_MCP_NO_TELEMETRY = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
delete process.env.RULE_MCP_NO_CAVEMAN;
delete process.env.RULE_MCP_CAVEMAN_LEVEL;

const { resumeContext } = await import("../index.js");
const { getTokenStats, resetTokenStats } = await import("../../../telemetry/_token-stats.js");

/** Estimate, the same char/4 heuristic the project reports elsewhere. */
const tokens = (text) => Math.ceil(text.length / 4);

/** A temp git project whose handoff is deliberately verbose prose. */
function verboseProject() {
  const dir = mkdtempSync(join(tmpdir(), "rule-resume-verbose-"));
  execFileSync("git", ["init", "-q", "-b", "feat/x"], { cwd: dir, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "t@t.t"], { cwd: dir, stdio: "ignore" });
  execFileSync("git", ["config", "user.name", "t"], { cwd: dir, stdio: "ignore" });
  writeFileSync(join(dir, "README.md"), "# t\n");
  execFileSync("git", ["add", "-A"], { cwd: dir, stdio: "ignore" });
  execFileSync("git", ["commit", "-qm", "chore(test): seed"], { cwd: dir, stdio: "ignore" });

  mkdirSync(join(dir, "docs", "handoff"), { recursive: true });
  writeFileSync(
    join(dir, "docs", "handoff", "01-verbose.md"),
    [
      "# Handoff: compression surfaces",
      "",
      "- **Date**: 2026-09-10",
      "- **Branch**: `feat/x`",
      "",
      "## What was happening",
      "",
      "The team was basically working on the compression surfaces for the whole morning and we were really just trying to make sure that every single interaction from the server towards the models gets compressed automatically and reliably, so that the context stays small for the rest of the session and the tokens are saved for the things that actually matter.",
      "",
      "## Open",
      "",
      "- [ ] Wire the normalized key into `rule_tool_gateway`",
      "- [ ] Run `pnpm run ci` before the commit",
      "",
      "## Suggested first move",
      "",
      "You should always make sure to continue from the first open item and never forget to run the full test suite before you are done.",
      "",
    ].join("\n"),
  );

  return dir;
}

test("the resume hook block is compressed, structure intact, booked under its own source", () => {
  resetTokenStats();
  const dir = verboseProject();

  try {
    const compressed = resumeContext({ source: "resume", cwd: dir });

    assert.ok(compressed.includes("## PIX RESUMED SESSION"), "the block keeps its own heading");
    assert.ok(compressed.includes("## Still true"), "the claim headings survive");
    assert.ok(compressed.includes("01-verbose"), "the handoff file name survives");
    assert.ok(compressed.includes("`rule_tool_gateway`"), "inline code survives untouched");

    // Caveman was on (no opt-outs): the pass must have removed something.
    const stats = getTokenStats();
    assert.ok((stats.savedBySource["caveman-resume"] ?? 0) > 0, "the block books a caveman-resume saving");

    // The compressed block is strictly shorter than the raw one.
    process.env.RULE_MCP_NO_CAVEMAN = "1";
    try {
      const raw = resumeContext({ source: "resume", cwd: dir });
      assert.ok(tokens(compressed) < tokens(raw), `compressed (${tokens(compressed)}) must beat raw (${tokens(raw)})`);
    } finally {
      delete process.env.RULE_MCP_NO_CAVEMAN;
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the resume hook still respects both opt-outs", () => {
  const dir = verboseProject();

  try {
    process.env.RULE_MCP_NO_RESUME_HANDON = "1";
    try {
      assert.equal(resumeContext({ source: "resume", cwd: dir }), "", "NO_RESUME_HANDON silences the block");
    } finally {
      delete process.env.RULE_MCP_NO_RESUME_HANDON;
    }

    process.env.RULE_MCP_NO_CAVEMAN = "1";
    try {
      assert.ok(resumeContext({ source: "resume", cwd: dir }).includes("## PIX RESUMED SESSION"), "NO_CAVEMAN keeps the block, uncompressed");
    } finally {
      delete process.env.RULE_MCP_NO_CAVEMAN;
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Keep the temp state dir honest even if an assertion above fails first.
test.after(() => {
  try {
    rmSync(process.env.RULE_MCP_STATE_DIR, { recursive: true, force: true });
  } catch {
    /* best effort */
  }
});
