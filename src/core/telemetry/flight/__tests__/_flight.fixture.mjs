

/**
 * Shared fixture for the flight-recorder suite: a sandboxed HOME, one acme-app
 * project, the sample session every numeric expectation is pinned to, and the
 * pi transcript fixture the usage tests read.
 */
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** The fixed clock the fixtures are stamped with. */
export const T0 = 1_760_000_000_000;

/** A per-file pass/fail harness that prints one line per check. */
export function makeCheck(title) {
  console.log(`=== ${title} ===\n`);
  const state = { pass: 0, fail: 0 };
  const check = (label, ok) => {
    if (ok) {
      state.pass++;
      console.log(`  ✅ ${label}`);
    } else {
      state.fail++;
      console.log(`  ❌ ${label}`);
    }
  };

  const finish = () => {
    console.log(`\nResults: ${state.pass} passed, ${state.fail} failed`);
    process.exit(state.fail > 0 ? 1 : 0);
  };

  return { check, finish };
}

/**
 * Pin HOME to a temp directory and create the acme-app project, chdir'd into.
 *
 * homedir() reads HOME, so pinning it is what keeps the fixtures this suite
 * records out of the person's own home directory. realpath, because macOS
 * hands out /var/folders and cwd reports /private/var.
 */
export function makeSandbox() {
  process.env.HOME = mkdtempSync(join(tmpdir(), "rule-flight-home-"));
  const workspace = realpathSync(mkdtempSync(join(tmpdir(), "rule-flight-")));
  const project = join(workspace, "acme-app");

  mkdirSync(join(project, ".git"), { recursive: true });
  mkdirSync(join(project, "src", "deep"), { recursive: true });
  delete process.env.RULE_MCP_NO_TELEMETRY;
  delete process.env.RULE_MCP_NO_PROMPTS;
  delete process.env.RULE_MCP_STATE_DIR;
  process.chdir(project);

  return { workspace, project };
}

/**
 * Record the canonical sample session: the routed call, the cache hit, the
 * resource read, and the NO_PROMPTS call. Every KPI/export expectation in the
 * suite is pinned to these four events.
 */
export function recordSampleSession({ setClientInfo, startSession, recordToolCall, flush }) {
  setClientInfo({ name: "claude-code", version: "2.4.1" });
  startSession({ transport: "stdio", now: T0 });
  recordToolCall({
    tool: "pix_tool",
    args: { prompt: "add a dark mode toggle to the header for acme corp", mode: "full" },
    durationMs: 120,
    ok: true,
    cacheHit: false,
    cacheTier: "miss",
    entry: "router",
    routedSkill: "rule-frontend-react",
    mode: "full",
    argsBytes: 96,
    resultBytes: 8000,
    coreTokens: 2400,
    finalTokens: 1800,
    guardrailFailures: 3,
    guardrailRules: { "no-css-classes": 2, "semantic-html": 1 },
    saved: { compression: 600 },
    estimatedRouting: 12_000,
    now: T0 + 100,
  });
  recordToolCall({
    tool: "rule_tool_frontend_react",
    args: { prompt: "add a dark mode toggle to the header for acme corp" },
    durationMs: 8,
    ok: true,
    cacheHit: true,
    cacheTier: "exact",
    entry: "skill",
    resultBytes: 4000,
    argsBytes: 60,
    saved: { cache: 1000 },
    now: T0 + 200_000,
  });
  recordToolCall({
    tool: "get_pix_frontend_react_skill_full_content",
    resource: true,
    durationMs: 4,
    ok: true,
    resultBytes: 20_000,
    now: T0 + 200_400,
  });
  process.env.RULE_MCP_NO_PROMPTS = "1";
  recordToolCall({ tool: "pix_tool", args: { prompt: "a secret product plan" }, now: T0 + 300_000 });
  flush();
  delete process.env.RULE_MCP_NO_PROMPTS;
}

/**
 * Write the pi transcript fixture for a project: two assistant messages with
 * usage and cost, one user turn, one toolResult row.
 *
 * @returns {string} the fake agents home
 */
export function writePiFixture(workspace, project) {
  const fake = join(workspace, "agents");
  const piDir = join(fake, ".pi", "agent", "sessions", `--${project.slice(1).replaceAll("/", "-")}--`);

  mkdirSync(piDir, { recursive: true });
  writeFileSync(
    join(piDir, "2026-07-11T13-05-52-125Z_abc.jsonl"),
    [
      JSON.stringify({
        type: "message",
        message: { role: "user", content: [{ type: "text", text: "usa rule MCP" }] },
      }),
      // pi has a third role, and it is the one that would inflate the turn count.
      JSON.stringify({ type: "message", message: { role: "toolResult", content: [] } }),
      JSON.stringify({
        type: "message",
        message: {
          role: "assistant",
          model: "deepseek-v4-flash",
          provider: "opencode-go",
          usage: {
            input: 52_920,
            output: 255,
            cacheRead: 0,
            cacheWrite: 0,
            reasoning: 0,
            totalTokens: 53_175,
            cost: { input: 0.0116, output: 0.0002, total: 0.0118 },
          },
        },
      }),
      JSON.stringify({
        type: "message",
        message: {
          role: "assistant",
          model: "deepseek-v4-flash",
          usage: {
            input: 2096,
            output: 345,
            cacheRead: 52_992,
            cacheWrite: 0,
            reasoning: 100,
            totalTokens: 55_433,
            cost: { total: 0.001 },
          },
        },
      }),
    ].join("\n") + "\n",
  );

  return fake;
}
