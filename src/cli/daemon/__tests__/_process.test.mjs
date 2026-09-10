

/** Daemon process: log rotation, pid checks, dry-run and stale cleanup. */
import { strict as assert } from "node:assert";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const state = mkdtempSync(join(tmpdir(), "rule-daemon-proc-"));

test.before(() => {
  process.env.RULE_MCP_STATE_DIR = state;
});

test.after(() => {
  rmSync(state, { recursive: true, force: true });
  delete process.env.RULE_MCP_STATE_DIR;
});

const { rotateDaemonLog, startDaemonProcess, stopDaemonProcess } = await import("../_process.js");

test("rotateDaemonLog rolls an oversized log and leaves a small one", () => {
  const log = join(state, "daemon.log");
  writeFileSync(log, "x".repeat(6 * 1024 * 1024));
  rotateDaemonLog(log);
  assert.ok(statSync(`${log}.1`).size > 0, "the oversized log rotates to .1");
  assert.ok(!existsSync(log), "the original is gone after rotation");

  rmSync(`${log}.1`, { force: true });
  writeFileSync(log, "small");
  rotateDaemonLog(log);
  assert.equal(readFileSync(log, "utf8"), "small", "a small log is untouched");
  assert.ok(!existsSync(`${log}.1`), "no rotate without a reason");
});

test("startDaemonProcess reports a live pid and clears a stale one", () => {
  const pidFile = join(state, "daemon.pid");
  writeFileSync(pidFile, String(process.pid));
  const live = startDaemonProcess({ dryRun: true });
  assert.equal(live.action, "already-running", "a live pid wins");
  assert.equal(live.pid, process.pid, "the pid is reported");

  writeFileSync(pidFile, "999999");
  const stale = startDaemonProcess({ dryRun: true });
  assert.equal(stale.action, "dry-run (would spawn daemon)", "a stale pid falls through to the dry run");
  assert.ok(!existsSync(pidFile), "the stale pid file is cleared");
});

test("stopDaemonProcess reports when nothing runs", async () => {
  const stopped = await stopDaemonProcess({ dryRun: true });
  assert.equal(stopped.action, "not-running", "nothing runs, so the stop reports not-running");
});
