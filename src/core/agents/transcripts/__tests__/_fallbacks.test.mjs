/** Transcript fallbacks: zero-valued counters keep earlier totals, agents absent. */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const { readAgentUsage } = await import("../../index.js");

const home = mkdtempSync(join(tmpdir(), "rule-mcp-transcripts-zero-"));
const projectDir = mkdtempSync(join(tmpdir(), "rule-mcp-transcripts-project-"));

test.after(() => {
  rmSync(home, { recursive: true, force: true });
  rmSync(projectDir, { recursive: true, force: true });
});

test("zero-valued codex totals keep the earlier totals instead of resetting", () => {
  const dir = join(home, ".codex", "sessions", "2026", "01", "01");
  mkdirSync(dir, { recursive: true });
  const rows = [
    { type: "session_meta", payload: { cwd: projectDir } },
    {
      type: "token_count",
      timestamp: "2026-01-01T10:00:00Z",
      payload: { type: "token_count", info: { total_token_usage: { input_tokens: 8000, output_tokens: 900, cached_input_tokens: 100, reasoning_output_tokens: 5 } } },
    },
    {
      type: "token_count",
      timestamp: "2026-01-01T10:00:10Z",
      payload: { type: "token_count", info: { total_token_usage: { input_tokens: 0, output_tokens: 0, cached_input_tokens: 0, reasoning_output_tokens: 0 } } },
    },
  ];
  writeFileSync(join(dir, "rollout.jsonl"), rows.map((row) => JSON.stringify(row)).join("\n") + "\n");

  const usage = readAgentUsage({ agent: "codex", projectDir, home, since: Date.parse("2026-01-01"), until: Date.parse("2026-01-02") });

  assert.equal(usage.apiCalls, 2, "both token_count rows count");
  assert.equal(usage.input, 8000, "a zero input keeps the earlier total");
  assert.equal(usage.output, 900, "a zero output keeps the earlier total");
  assert.equal(usage.cacheRead, 100, "a zero cache keeps the earlier total");
  assert.equal(usage.reasoning, 5, "a zero reasoning keeps the earlier total");
});

test("opencode rows without cache or model fields still fold", () => {
  const base = join(home, ".local", "share", "opencode", "storage", "message", "lean");
  mkdirSync(base, { recursive: true });
  writeFileSync(
    join(base, "a.json"),
    JSON.stringify({ time: { created: "2026-01-01T09:00:00Z" }, path: { cwd: projectDir }, sessionID: "lean", role: "assistant", tokens: { input: 1, output: 2 } }),
  );
  writeFileSync(
    join(base, "b.json"),
    JSON.stringify({ time: { created: "2026-01-01T09:00:10Z" }, path: { cwd: projectDir }, sessionID: "lean", role: "assistant", tokens: { input: 4, output: 8 }, cost: "0" }),
  );

  const usage = readAgentUsage({ agent: "opencode", projectDir, home, since: Date.parse("2026-01-01"), until: Date.parse("2026-01-02") });

  assert.equal(usage.apiCalls, 2, "both messages count");
  assert.equal(usage.input, 5, "inputs sum");
  assert.equal(usage.cacheRead, 0, "no cache fields means zero");
  assert.equal(usage.peakContext, 4, "the last input sets the peak");
  assert.equal(usage.model, undefined, "no model id anywhere stays undefined");
});

test("a claude project with no sessions returns nothing", () => {
  const emptyHome = mkdtempSync(join(tmpdir(), "rule-mcp-claude-empty-"));
  assert.equal(readAgentUsage({ agent: "claude", projectDir, home: emptyHome }), undefined, "no claude transcripts means no usage");
  rmSync(emptyHome, { recursive: true, force: true });
});
