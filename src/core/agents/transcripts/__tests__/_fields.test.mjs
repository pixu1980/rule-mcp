

/** Transcript adapters: codex/opencode field folding, windows, and fs helpers. */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const { detectAgentUsage, readAgentUsage } = await import("../../index.js");
const { filesUnder, list, mtime, readJson, readJsonl } = await import("../_fs.js");

const home = mkdtempSync(join(tmpdir(), "rule-mcp-transcripts-fields-"));
const projectDir = mkdtempSync(join(tmpdir(), "rule-mcp-transcripts-project-"));

test.after(() => {
  rmSync(home, { recursive: true, force: true });
  rmSync(projectDir, { recursive: true, force: true });
});

/** One codex session day with the standard rows. */
function codexSession(file, cwd, { inWindowRows = true } = {}) {
  const dir = join(home, ".codex", "sessions", "2026", "01", "01");
  mkdirSync(dir, { recursive: true });
  const ts = "2026-01-01T10:00:00Z";
  const rows = [
    { type: "session_meta", payload: { cwd, model_provider: "openai" } },
    { type: "turn_context", payload: { model: "gpt-codex" } },
    { type: "user_message", payload: { type: "user_message", content: "hi" } },
    ...(inWindowRows
      ? [
          {
            type: "token_count",
            timestamp: ts,
            payload: {
              type: "token_count",
              info: {
                model_context_window: 128_000,
                last_token_usage: { total_tokens: 9000 },
                total_token_usage: { input_tokens: 8000, output_tokens: 900, cached_input_tokens: 100, reasoning_output_tokens: 200 },
              },
            },
          },
        ]
      : []),
    { type: "token_count", timestamp: "2030-01-01T00:00:00Z", payload: { type: "token_count", info: { total_token_usage: { input_tokens: 999_999 } } } },
  ];

  writeFileSync(join(dir, file), rows.map((row) => JSON.stringify(row)).join("\n") + "\n");
}

test("readAgentUsage folds a codex session and skips other projects", () => {
  codexSession("rollout-1.jsonl", projectDir);
  codexSession("rollout-2.jsonl", "/some/other/project");
  const usage = readAgentUsage({ agent: "codex", projectDir, home, since: Date.parse("2026-01-01"), until: Date.parse("2026-01-02") });

  assert.equal(usage.apiCalls, 1, "the in-window token_count counts");
  assert.equal(usage.input, 8000, "input tokens fold");
  assert.equal(usage.output, 900, "output tokens fold");
  assert.equal(usage.cacheRead, 100, "cached tokens fold");
  assert.equal(usage.reasoning, 200, "reasoning tokens fold");
  assert.equal(usage.peakContext, 9000, "the last token usage sets the peak");
  assert.equal(usage.userTurns, 1, "user messages count as turns");
  assert.equal(usage.model, "gpt-codex", "the model comes from turn_context");
  assert.equal(usage.provider, "openai", "the provider comes from session_meta");
  assert.equal(usage.contextWindow, 128_000, "the context window is carried");
});

test("a codex folder with no matching cwd returns nothing", () => {
  const lone = mkdtempSync(join(tmpdir(), "rule-mcp-codex-lone-"));
  const other = mkdtempSync(join(tmpdir(), "rule-mcp-codex-none-"));

  assert.equal(readAgentUsage({ agent: "codex", projectDir: other, home: lone }), undefined, "no matching session means no usage");
  assert.equal(detectAgentUsage({ projectDir: other, home: lone }), undefined, "the detector finds nothing");
  rmSync(lone, { recursive: true, force: true });
  rmSync(other, { recursive: true, force: true });
});

test("opencode folds tokens, cost and model id from message files", () => {
  const base = join(home, ".local", "share", "opencode", "storage", "message", "session-7");
  mkdirSync(base, { recursive: true });
  writeFileSync(
    join(base, "1.json"),
    JSON.stringify({
      time: { created: "2026-01-01T10:00:00Z" },
      path: { root: projectDir },
      sessionID: "session-7",
      role: "user",
    }),
  );
  writeFileSync(
    join(base, "2.json"),
    JSON.stringify({
      time: { created: "2026-01-01T10:00:05Z" },
      path: { root: projectDir },
      sessionID: "session-7",
      role: "assistant",
      modelID: "opencode-model",
      providerID: "opencode-provider",
      cost: 0.04,
      tokens: { input: 100, output: 50, cache: { read: 20, write: 10 }, reasoning: 5 },
    }),
  );
  writeFileSync(
    join(base, "3.json"),
    JSON.stringify({
      time: { created: "2030-01-01T00:00:00Z" },
      path: { root: projectDir },
      sessionID: "session-7",
      role: "assistant",
      tokens: { input: 999_999 },
    }),
  );

  const usage = readAgentUsage({ agent: "opencode", projectDir, home, since: Date.parse("2026-01-01"), until: Date.parse("2026-01-02") });

  assert.equal(usage.apiCalls, 1, "the out-of-window message is skipped");
  assert.equal(usage.userTurns, 1, "the user message counts");
  assert.equal(usage.input, 100, "tokens fold");
  assert.equal(usage.cacheRead, 20, "cache reads fold");
  assert.equal(usage.cacheWrite, 10, "cache writes fold");
  assert.equal(usage.reasoning, 5, "reasoning folds");
  assert.equal(usage.peakContext, 130, "peak context is input plus cache");
  assert.equal(usage.model, "opencode-model", "the model id carries");
});

test("the transcript fs helpers fail closed", () => {
  assert.deepEqual(readJsonl(join(home, "missing.jsonl")), [], "a missing jsonl reads empty");
  assert.deepEqual(readJson(join(home, "missing.json")), undefined, "a missing json reads undefined");
  assert.deepEqual(filesUnder(join(home, "missing", "dir"), 2), [], "a missing tree lists empty");
  assert.equal(mtime(join(home, "missing")), 0, "a missing file has no mtime");
  assert.deepEqual(list(join(home, "missing")), [], "a missing dir lists empty");

  writeFileSync(join(home, "half.jsonl"), '{"ok":true}\n{"broken', "utf8");
  const rows = readJsonl(join(home, "half.jsonl"));
  assert.equal(rows.length, 1, "a half-written trailing line is skipped");
});
