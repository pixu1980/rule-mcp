

/**
 * Branch coverage for the optional tasks' failure and non-dry-run arms: a
 * command sync the CLI rejects, a skills install that succeeds or cannot
 * write, a health check that passes or cannot start, and Docker both ready
 * and missing.
 *
 * The real runs are sandboxed to a scratch home; the Docker cases drive the
 * probe with a fake `docker` on PATH, so the result does not depend on the
 * machine's container runtime.
 */
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const home = mkdtempSync(join(tmpdir(), "rule-task-extras-branches-"));

process.env.HOME = home;
process.env.RULE_MCP_HOME = join(home, ".rule-mcp");
process.env.RULE_MCP_SKIP_GLOBAL_LINK = "1";

const { commandsTask, dockerTask, doctorTask, skillsTask } = await import("../_task-extras.js");

test.after(() => rmSync(home, { recursive: true, force: true }));

/** Run fn with the given env overrides, restoring every touched key. */
async function withEnv(overrides, fn) {
  const saved = {};

  for (const [key, value] of Object.entries(overrides)) {
    saved[key] = process.env[key];

    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return await fn();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

/** Run fn from dir, restoring the working directory afterwards. */
function fromDirectory(dir, fn) {
  const saved = process.cwd();

  process.chdir(dir);

  try {
    return fn();
  } finally {
    process.chdir(saved);
  }
}

/** An executable named docker in dir. */
function fakeDocker(dir) {
  const path = join(dir, "docker");

  mkdirSync(dir, { recursive: true });
  writeFileSync(path, "#!/bin/sh\nexit 0\n");
  chmodSync(path, 0o755);

  return path;
}

test("a command sync the CLI rejects is a warning row", async () => {
  const result = await commandsTask(false, ["claude"], { preset: "not-a-preset" }).run({ dryRun: true });

  assert.equal(result.status, "warn");
  assert.equal(result.summary, "failed");
  assert.ok(result.lines.length > 0, "the CLI's complaint is kept for the log");
  assert.ok(
    result.lines.some((line) => /--preset|choices|not-a-preset/i.test(line)),
    `the row says why: ${result.lines.join(" | ")}`,
  );
});

test("a real skills install reports installed", async () => {
  const result = await skillsTask().run({ dryRun: false });

  assert.equal(result.status, "ok");
  assert.equal(result.summary, "installed");
});

test("a skills install that cannot write warns", async () => {
  // /dev/null is a file, so the child cannot create ~/.agents/skills below it.
  const result = await withEnv({ HOME: "/dev/null" }, () => skillsTask().run({ dryRun: false }));

  assert.equal(result.status, "warn");
  assert.equal(result.summary, "had issues");
  assert.ok(result.lines.length > 0, "the failure is kept for the log");
});

test("a health check that passes reports passed", async () => {
  const result = await doctorTask().run({ dryRun: false });

  assert.equal(result.status, "ok");
  assert.equal(result.summary, "passed");
});

test("a health check that cannot start reports issues", async () => {
  // Node refuses the bad option before the CLI runs, which is the same row a
  // doctor that exits non-zero produces.
  const result = await withEnv({ NODE_OPTIONS: "--rule-mcp-bogus-flag" }, () => doctorTask().run({ dryRun: false }));

  assert.equal(result.status, "warn");
  assert.equal(result.summary, "reported issues");
  assert.ok(result.lines.length > 0, "the reason the child printed is kept");
});

test("a ready docker host is planned", async () => {
  const cwd = join(home, "compose-ready");
  const bin = join(home, "docker-bin");
  const state = join(home, "docker-state");

  mkdirSync(cwd, { recursive: true });
  mkdirSync(state, { recursive: true });
  writeFileSync(join(cwd, "docker-compose.yml"), "services: {}\n");
  writeFileSync(join(state, "sse-token"), "token\n");
  fakeDocker(bin);

  const result = await withEnv({ PATH: `${bin}:${process.env.PATH}`, RULE_MCP_STATE_DIR: state }, () => fromDirectory(cwd, () => dockerTask().run({ dryRun: true })));

  assert.equal(result.status, "ok", "a dry run with every precondition met plans");
  assert.equal(result.summary, "planned");
});

test("a host without Docker Compose is blocked and warns", async () => {
  const cwd = join(home, "compose-missing");
  const bin = join(home, "docker-absent");

  mkdirSync(cwd, { recursive: true });
  mkdirSync(bin, { recursive: true });
  writeFileSync(join(cwd, "docker-compose.yml"), "services: {}\n");

  const result = await withEnv({ PATH: bin, RULE_MCP_STATE_DIR: join(home, "docker-state-missing") }, () => fromDirectory(cwd, () => dockerTask().run({ dryRun: true })));

  assert.equal(result.status, "warn");
  assert.match(result.summary, /^blocked/);
  assert.match(result.summary, /Docker Compose v2 is required/);
});
