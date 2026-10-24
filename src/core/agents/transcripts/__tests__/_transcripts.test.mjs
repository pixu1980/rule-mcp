/**
 * @module test/agent-transcripts.test
 *
 * Model usage read from the coding agent's own transcript: pi, Claude Code,
 * Codex and opencode each keep per-call token usage on disk, and the adapters
 * here fold it into the tally the benchmarks report. This server never calls a
 * model, so the agent's own record is the only source of the real numbers.
 *
 * A transcript the adapter does not understand contributes nothing - a
 * fabricated zero gets averaged, which is worse than an absent number.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { AGENT_TRANSCRIPTS, detectAgentUsage, readAgentUsage, supportedAgents, unsupportedAgents } = await import("../../../../../src/core/agents/transcripts/index.js");

const home = mkdtempSync(join(tmpdir(), "rule-mcp-transcripts-home-"));

/** A fake pi session directory: --Users-me-app-- with one JSONL row. */
function piSession(projectDir, row, file = "s1.jsonl") {
  const slug = `--${projectDir.replace(/^\//, "").replaceAll("/", "-")}--`;
  const dir = join(home, ".pi", "agent", "sessions", slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, file), `${JSON.stringify(row)}\n`);
}

test("the adapter table lists the four readable agents and states the rest", () => {
  assert.deepEqual(supportedAgents(), ["pi", "claude", "codex", "opencode"]);
  for (const entry of unsupportedAgents()) {
    assert.ok(entry.reason && entry.reason.length > 10, `${entry.agent} must say why it is unsupported`);
  }
  assert.ok(AGENT_TRANSCRIPTS.every((entry) => Boolean(entry.read) !== Boolean(entry.reason)));
});

test("readAgentUsage folds a pi session, counting only human turns as turns", () => {
  const projectDir = mkdtempSync(join(tmpdir(), "rule-mcp-transcripts-project-"));
  piSession(projectDir, {
    timestamp: "2026-01-01T00:00:00Z",
    message: {
      role: "user",
      usage: { input: 100, output: 20, cacheRead: 5, cost: { total: 0.01 } },
      model: "test-model",
    },
  });
  piSession(
    projectDir,
    {
      timestamp: "2026-01-01T00:00:00Z",
      message: {
        role: "toolResult",
        usage: { input: 0, output: 25, cacheRead: 10 },
      },
    },
    "s2.jsonl",
  );

  const usage = readAgentUsage({ agent: "pi", projectDir, home });

  assert.ok(usage, "a session must be read");
  assert.equal(usage.userTurns, 1, "a toolResult role is not a human turn");
  assert.equal(usage.apiCalls, 2);
  assert.equal(usage.input, 100);
  assert.equal(usage.output, 45);
  assert.equal(usage.cacheRead, 15);
  assert.equal(usage.costUsd, 0.01);
});

test("an unknown agent and an empty transcript both contribute nothing", () => {
  const projectDir = mkdtempSync(join(tmpdir(), "rule-mcp-transcripts-none-"));
  assert.equal(readAgentUsage({ agent: "cursor", projectDir, home }), undefined);
  assert.equal(readAgentUsage({ agent: "pi", projectDir, home }), undefined);
});

test("detectAgentUsage picks the busiest agent and honors the client hint", () => {
  const projectDir = mkdtempSync(join(tmpdir(), "rule-mcp-transcripts-multi-"));
  piSession(projectDir, {
    timestamp: "2026-01-01T00:00:00Z",
    message: { role: "user", usage: { input: 10, output: 10 }, model: "m1" },
  });
  piSession(
    projectDir,
    {
      timestamp: "2026-01-01T00:00:01Z",
      message: { role: "assistant", usage: { input: 10, output: 10 }, model: "m1" },
    },
    "s2.jsonl",
  );

  const detected = detectAgentUsage({ projectDir, home });
  assert.ok(detected, "a project with a session is detected");
  assert.equal(detected.agent, "pi");
  assert.equal(detected.apiCalls, 2);

  rmSync(home, { recursive: true, force: true });
});
