/**
 * @module test/self-update-throttle
 *
 * Tests the throttled, per-invocation, fire-and-forget self-update trigger
 * (ADR 023):
 *   a) the check re-runs once the interval elapses — not once per process
 *   b) maybeSelfUpdate() returns immediately (does not block the tool call)
 *   c) interval env parsing: default 60s, 0 = check on every call,
 *      invalid/negative → default
 *
 * Deterministic: sandboxed git repos (no network) + a PATH-stubbed `git` that
 * logs every subcommand to a file. Scenarios run in a child process so module
 * state is fresh and RULE_MCP_REPO_ROOT can point at the sandbox clone.
 */

import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

console.log("self-update throttle test");

const g = (arguments_, cwd) => execFileSync("git", arguments_, { cwd, stdio: ["ignore", "pipe", "ignore"], encoding: "utf8" });

/** Build a bare "upstream" + a working clone that tracks it (same as self-update.test). */
function makeClonePair() {
  const base = mkdtempSync(join(tmpdir(), "rule-sut-"));
  const upstream = join(base, "upstream.git");
  const clone = join(base, "clone");
  mkdirSync(upstream);
  g(["init", "--bare", "-b", "main"], upstream);
  const seed = join(base, "seed");
  mkdirSync(seed);
  g(["init", "-b", "main"], seed);
  g(["config", "user.email", "t@t.t"], seed);
  g(["config", "user.name", "t"], seed);
  mkdirSync(join(seed, "skills", "rule"), { recursive: true });
  writeFileSync(join(seed, "skills", "rule", "SKILL.md"), "v1\n");
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
function makeGitStub() {
  const dir = mkdtempSync(join(tmpdir(), "rule-gitstub-"));
  const log = join(mkdtempSync(join(tmpdir(), "rule-gitlog-")), "git.log");
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
function runScenario(clone, scriptBody, environment = {}) {
  const stub = makeGitStub();
  const moduleUrl = new URL("../src/core/self-update.js", import.meta.url).href;
  const script = `
    const { maybeSelfUpdate } = await import(${JSON.stringify(moduleUrl)});
    ${scriptBody}
  `;
  const out = execFileSync(process.execPath, ["--input-type=module", "--eval", script], {
    cwd: clone,
    env: {
      ...process.env,
      RULE_MCP_REPO_ROOT: clone,
      PATH: `${stub.dir}:${process.env.PATH}`,
      RULE_MCP_GIT_LOG: stub.log,
      ...environment,
    },
    encoding: "utf8",
  });
  return { out: JSON.parse(out), logPath: stub.log };
}

const fetchCount = (logPath) =>
  readFileSync(logPath, "utf8")
    .split("\n")
    .filter((l) => l === "fetch").length;

// ── S1: re-check after interval elapses (today: once per process) ──
{
  const { clone, base } = makeClonePair();
  const { logPath } = runScenario(
    clone,
    `
    await maybeSelfUpdate();
    await new Promise((r) => setTimeout(r, 300));
    await maybeSelfUpdate();
    await new Promise((r) => setTimeout(r, 150));
    process.stdout.write(JSON.stringify({ done: true }));
  `,
    { RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS: "0.1" },
  );
  const fetches = fetchCount(logPath);
  assert.equal(fetches, 2, `interval elapsed => a second invocation must fetch again (got ${fetches})`);
  rmSync(base, { recursive: true, force: true });
  console.log("  ✅ interval elapsed triggers a new fetch (not once-per-process)");
}

// ── S2: non-blocking — maybeSelfUpdate returns before the fetch completes ──
{
  const { clone, base } = makeClonePair();
  const { out } = runScenario(
    clone,
    `
    const t0 = Date.now();
    const p = maybeSelfUpdate();
    const t1 = Date.now();
    process.stdout.write(JSON.stringify({ returnedMs: t1 - t0 }));
    await p;
  `,
    { RULE_MCP_GIT_SLEEP: "2" }, // every git call takes 2s
  );
  assert.ok(
    out.returnedMs < 1500,
    `fire-and-forget: call returned in ${out.returnedMs}ms, must not block on the fetch`,
  );
  rmSync(base, { recursive: true, force: true });
  console.log("  ✅ maybeSelfUpdate returns immediately (background check)");
}

// ── S3a: interval 0 => check on every invocation ──
{
  const { clone, base } = makeClonePair();
  const { logPath } = runScenario(
    clone,
    `
    await maybeSelfUpdate();
    await maybeSelfUpdate();
    process.stdout.write(JSON.stringify({ done: true }));
  `,
    { RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS: "0" },
  );
  const fetches = fetchCount(logPath);
  assert.equal(fetches, 2, `interval 0 => every invocation fetches (got ${fetches})`);
  rmSync(base, { recursive: true, force: true });
  console.log("  ✅ interval 0 checks on every invocation");
}

// ── S3b: invalid interval => default 60s (throttled) ──
{
  const { clone, base } = makeClonePair();
  const { logPath } = runScenario(
    clone,
    `
    await maybeSelfUpdate();
    await maybeSelfUpdate();
    process.stdout.write(JSON.stringify({ done: true }));
  `,
    { RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS: "abc" },
  );
  const fetches = fetchCount(logPath);
  assert.equal(fetches, 1, `invalid interval => default throttle, single fetch (got ${fetches})`);
  rmSync(base, { recursive: true, force: true });
  console.log("  ✅ invalid interval falls back to the default (1 fetch)");
}

// ── S3c: negative interval => default 60s (throttled) ──
{
  const { clone, base } = makeClonePair();
  const { logPath } = runScenario(
    clone,
    `
    await maybeSelfUpdate();
    await maybeSelfUpdate();
    process.stdout.write(JSON.stringify({ done: true }));
  `,
    { RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS: "-5" },
  );
  const fetches = fetchCount(logPath);
  assert.equal(fetches, 1, `negative interval => default throttle, single fetch (got ${fetches})`);
  rmSync(base, { recursive: true, force: true });
  console.log("  ✅ negative interval falls back to the default (1 fetch)");
}

console.log("\nself-update throttle: all checks passed");
