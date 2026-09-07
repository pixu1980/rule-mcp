/**
 * @module test/telemetry/fixture
 *
 * Local telemetry, to the spec agreed on 2026-08-04. Shared plumbing: the
 * check harness, a scratch state dir and project, the module imports, and the
 * standard three-call recording every suite seeds its process with.
 */
import { mkdirSync, mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let pass = 0;
let fail = 0;

/** Print-style assertion; exit code handled by finish(). */
export const check = (label, ok) => {
  if (ok) {
    pass++;
    console.log(`  \u2705 ${label}`);
  } else {
    fail++;
    console.log(`  \u274C ${label}`);
  }
};

/** Print the tally and set the exit code. */
export function finish() {
  console.log(`\nResults: ${pass} passed, ${fail} failed`);
  if (fail > 0) {
    process.exit(1);
  }
}

export const stateDir = mkdtempSync(join(tmpdir(), "rule-telemetry-"));
process.env.RULE_MCP_STATE_DIR = stateDir;
delete process.env.RULE_MCP_NO_TELEMETRY;
delete process.env.RULE_MCP_NO_PROMPTS;
// The log is project-scoped, so each suite gets a project of its own. realpath,
// because macOS hands out /var/folders while cwd reports /private/var.
export const projectDir = realpathSync(mkdtempSync(join(tmpdir(), "rule-telemetry-project-")));
mkdirSync(join(projectDir, ".git"), { recursive: true });
process.chdir(projectDir);

export const recorder = await import("../../../src/core/telemetry/recorder/index.js");
export const store = await import("../../../src/core/telemetry/store/index.js");

export const DAY = 86_400_000;
export const T0 = 1_760_000_000_000;

/** The standard session: two connections, three calls, flushed to disk. */
export function seedEvents() {
  recorder.startSession({ transport: "stdio", now: T0 });
  const firstSession = recorder.sessionId();
  recorder.endSession({ now: T0 + 1000 });
  recorder.startSession({ transport: "stdio", now: T0 + 2000 });
  recorder.recordToolCall({
    tool: "pix_tool",
    args: { prompt: "add a dark mode toggle to the header for acme corp" },
    durationMs: 12,
    ok: true,
    cacheHit: false,
    routedSkill: "rule-frontend-react",
    saved: { cache: 0, caveman: 120, tokensave: 0, estimatedRouting: 3400 },
    now: T0 + 2100,
  });
  recorder.recordToolCall({
    tool: "rule_tool_check",
    durationMs: 4,
    ok: false,
    cacheHit: false,
    guardrailFailures: 3,
    now: T0 + 2200,
  });
  recorder.recordToolCall({
    tool: "pix_tool",
    durationMs: 1,
    ok: true,
    cacheHit: true,
    saved: { cache: 900 },
    now: T0 + 2300,
  });
  recorder.flush();

  return { firstSession };
}
