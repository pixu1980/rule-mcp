/** The daemon command dispatcher: install/uninstall/start/stop/status/logs arms. */
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-daemon-cmd-"));
process.env.RULE_MCP_NO_AUTOUPDATE = "1";

import { daemonCommand } from "../_daemon.js";

test.after(() => {
  rmSync(process.env.RULE_MCP_STATE_DIR, { recursive: true, force: true });
  delete process.env.RULE_MCP_STATE_DIR;
});

test("install and uninstall run dry and report their result", () => {
  assert.doesNotThrow(() => daemonCommand({ action: "install", dryRun: true }), "install dry-run completes");
  assert.doesNotThrow(() => daemonCommand({ action: "uninstall", dryRun: true }), "uninstall dry-run completes");
});

test("start and stop fall back to the process daemon without one installed", async () => {
  assert.doesNotThrow(() => daemonCommand({ action: "start", dryRun: true }), "start dry-run completes");
  await daemonCommand({ action: "stop", dryRun: true });
});

test("start reports an already-running daemon from the pid file", async () => {
  writeFileSync(join(process.env.RULE_MCP_STATE_DIR, "daemon.pid"), String(process.pid), "utf8");
  assert.doesNotThrow(() => daemonCommand({ action: "start", dryRun: true }), "a live pid is reported as already running");
});

test("status renders without a pid file", () => {
  assert.doesNotThrow(() => daemonCommand({ action: "status" }));
});

test("logs reports missing and existing log files", () => {
  const stateDir = process.env.RULE_MCP_STATE_DIR;
  assert.doesNotThrow(() => daemonCommand({ action: "logs" }), "no log file yet is fine");

  writeFileSync(join(stateDir, "daemon.log"), "line one\nline two\n", "utf8");
  assert.doesNotThrow(() => daemonCommand({ action: "logs" }), "an existing log renders");
});

test("an unknown action fails loudly", async () => {
  await assert.rejects(() => daemonCommand({ action: "sideways" }), /Unknown daemon action/, "unknown actions throw");
});
