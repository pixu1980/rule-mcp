

/**
 * @module test/self-update-throttle
 *
 * Tests the throttled, per-invocation, fire-and-forget self-update trigger
 * (ADR 022):
 *   a) the check re-runs once the interval elapses - not once per process
 *   b) maybeSelfUpdate() returns immediately (does not block the tool call)
 *   c) interval env parsing: default 60s, 0 = check on every call,
 *      invalid/negative -> default
 *
 * Deterministic: sandboxed git repos (no network) + a PATH-stubbed `git` that
 * logs every subcommand to a file. Scenarios run in a child process so module
 * state is fresh and RULE_MCP_REPO_ROOT can point at the sandbox clone.
 */

import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import "../../../../tests/fixtures/git-hermetic.mjs";

// Server code resolves `@src/*` through a hook (ADR 089); a spawned
// process loads it too, so it registers the hook as every entry point does.
const ALIAS_HOOK = fileURLToPath(new URL("../../../../scripts/alias-hook.mjs", import.meta.url));

/** Run one git command in `cwd`, quietly, returning its stdout. */
export const g = (arguments_, cwd) => execFileSync("git", arguments_, { cwd, stdio: ["ignore", "pipe", "ignore"], encoding: "utf8" });

/** Build a bare "upstream" + a working clone that tracks it (same as self-update.test). */
export function makeClonePair() {
  const base = mkdtempSync(join(tmpdir(), "rule-mcp-sut-"));
  const upstream = join(base, "upstream.git");
  const clone = join(base, "clone");
  mkdirSync(upstream);
  g(["init", "--bare", "-b", "main"], upstream);
  const seed = join(base, "seed");
  mkdirSync(seed);
  g(["init", "-b", "main"], seed);
  g(["config", "user.email", "t@t.t"], seed);
  g(["config", "user.name", "t"], seed);
  mkdirSync(join(seed, "skills", "rule-mcp"), { recursive: true });
  writeFileSync(join(seed, "skills", "rule-mcp", "SKILL.md"), "v1\n");
  g(["add", "-A"], seed);
  g(["commit", "-m", "seed"], seed);
  g(["remote", "add", "origin", upstream], seed);
  g(["push", "-u", "origin", "main"], seed);
  g(["clone", upstream, clone], base);
  g(["config", "user.email", "t@t.t"], clone);
  g(["config", "user.name", "t"], clone);

  return { base, upstream, clone, seed };
}

/** Real git binary path, resolved without touching our stubbed PATH. */
const REAL_GIT = process.env.PATH.split(":")
  .map((d) => join(d, "git"))
  .find((p) => existsSync(p));

/**
 * Create a stub `git` that logs every subcommand (first arg) to the file in
 * $RULE_MCP_GIT_LOG, optionally sleeps $RULE_MCP_GIT_SLEEP seconds,
 * then delegates to the real git. Returns the directory to prepend to PATH.
 */
export function makeGitStub() {
  const dir = mkdtempSync(join(tmpdir(), "rule-mcp-gitstub-"));
  const log = join(mkdtempSync(join(tmpdir(), "rule-mcp-gitlog-")), "git.log");
  const stub = String.raw`#!/bin/sh
printf '%s\n' "$1" >> "$RULE_MCP_GIT_LOG"
if [ -n "$RULE_MCP_GIT_SLEEP" ]; then sleep "$RULE_MCP_GIT_SLEEP"; fi
exec ${REAL_GIT} "$@"
`;
  writeFileSync(join(dir, "git"), stub);
  chmodSync(join(dir, "git"), 0o755);

  return { dir, log };
}

/**
 * Run a scenario script in a child process with cwd=clone, the stubbed git on
 * PATH, and env overrides. Returns { out, logPath }.
 */
export function runScenario(clone, scriptBody, environment = {}) {
  const stub = makeGitStub();
  const moduleUrl = new URL("../index.js", import.meta.url).href;
  const script = `
    const { maybeSelfUpdate } = await import(${JSON.stringify(moduleUrl)});
    ${scriptBody}
  `;
  const out = execFileSync(process.execPath, ["--import", ALIAS_HOOK, "--input-type=module", "--eval", script], {
    cwd: clone,
    env: {
      ...process.env,
      RULE_MCP_REPO_ROOT: clone,
      // A scenario runs the persisted-throttle-state path (_state-store.js)
      // for real, so it needs its own home - without this it would read and
      // write the developer's actual ~/.rule-mcp/state.
      RULE_MCP_HOME: mkdtempSync(join(tmpdir(), "rule-mcp-sut-home-")),
      PATH: `${stub.dir}:${process.env.PATH}`,
      RULE_MCP_GIT_LOG: stub.log,
      ...environment,
    },
    encoding: "utf8",
  });

  return { out: JSON.parse(out), logPath: stub.log };
}

/**
 * How many times the stubbed git ran "fetch". The stub only creates the log
 * file on its first invocation, so a scenario that short-circuits before any
 * git call (a persisted-throttle skip) leaves no file at all - that is 0
 * fetches, not a read error.
 */
export const fetchCount = (logPath) => {
  if (!existsSync(logPath)) {
    return 0;
  }

  return readFileSync(logPath, "utf8")
    .split("\n")
    .filter((l) => l === "fetch").length;
};

/** The clone's upstream URL, so the pin allows the fetch. */
export const upstreamOf = (clone) => execFileSync("git", ["remote", "get-url", "origin"], { cwd: clone, encoding: "utf8" }).trim();
