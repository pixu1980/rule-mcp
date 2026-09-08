/** The Claude Code reader: human turns, tool results, usage blocks, the window. */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { readAgentUsage } = await import("../index.js");

const home = mkdtempSync(join(tmpdir(), "rule-read-claude-home-"));

test.after(() => rmSync(home, { recursive: true, force: true }));

test("the claude reader counts humans, skips tool results and rows outside the window", () => {
  const projectDir = mkdtempSync(join(tmpdir(), "rule-read-claude-project-"));
  const dir = join(home, ".claude", "projects", projectDir.replaceAll("/", "-"));
  mkdirSync(dir, { recursive: true });

  const rows = [
    // A human prompt inside the window, then the model turn with usage.
    {
      timestamp: "2026-01-01T00:00:10Z",
      type: "user",
      message: { role: "user", content: "hello" },
    },
    {
      timestamp: "2026-01-01T00:00:11Z",
      type: "assistant",
      message: {
        model: "claude-fable-5",
        usage: { input_tokens: 100, cache_read_input_tokens: 50, cache_creation_input_tokens: 25, output_tokens: 10, output_tokens_details: { thinking_tokens: 4 } },
      },
    },
    // A tool result comes back as a user row: not a human turn.
    {
      timestamp: "2026-01-01T00:00:12Z",
      type: "user",
      message: { role: "user", content: [{ type: "tool_result", content: "ok" }] },
    },
    // A row with no usage block contributes nothing.
    { timestamp: "2026-01-01T00:00:13Z", type: "system" },
    // A row far outside the window is dropped entirely.
    {
      timestamp: "2025-01-01T00:00:00Z",
      type: "user",
      message: { role: "user", content: "ancient", usage: { input_tokens: 999 } },
    },
  ];
  writeFileSync(join(dir, "s1.jsonl"), rows.map((row) => JSON.stringify(row)).join("\n") + "\n");

  const usage = readAgentUsage({
    agent: "claude",
    projectDir,
    home,
    since: Date.parse("2026-01-01T00:00:00Z"),
    until: Date.parse("2026-01-01T00:01:00Z"),
  });

  assert.ok(usage, "the session is read");
  assert.equal(usage.userTurns, 1, "only the human prompt counts as a turn");
  assert.equal(usage.apiCalls, 1, "only the row with usage counts as a call");
  assert.equal(usage.input, 100);
  assert.equal(usage.cacheRead, 50);
  assert.equal(usage.cacheWrite, 25);
  assert.equal(usage.output, 10);
  assert.equal(usage.reasoning, 4, "thinking tokens fold into reasoning");
  assert.equal(usage.peakContext, 175, "peak context sums input and both caches");
  assert.equal(usage.model, "claude-fable-5");

  rmSync(projectDir, { recursive: true, force: true });
});

test("missing token fields fold as zero and the first model name sticks", () => {
  const projectDir = mkdtempSync(join(tmpdir(), "rule-read-claude-sparse-"));
  const dir = join(home, ".claude", "projects", projectDir.replaceAll("/", "-"));
  mkdirSync(dir, { recursive: true });

  const rows = [
    { type: "assistant", message: { model: "first-model", usage: { output_tokens: 5 } } },
    { type: "assistant", message: { model: "second-model", usage: { input_tokens: "not-a-number" } } },
  ];
  writeFileSync(join(dir, "s1.jsonl"), rows.map((row) => JSON.stringify(row)).join("\n") + "\n");

  const usage = readAgentUsage({ agent: "claude", projectDir, home });

  assert.equal(usage.apiCalls, 2, "both usage rows count as calls");
  assert.equal(usage.input, 0, "an unparseable input folds as zero");
  assert.equal(usage.output, 5, "the present field folds");
  assert.equal(usage.reasoning, 0, "no thinking details means zero reasoning");
  assert.equal(usage.model, "first-model", "the first model name sticks");

  rmSync(projectDir, { recursive: true, force: true });
});
