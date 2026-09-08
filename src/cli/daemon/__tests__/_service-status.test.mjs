/** checkDaemonService and formatDaemonStatus on the macos arm, in a fake home. */
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const home = mkdtempSync(join(tmpdir(), "rule-daemon-status-"));
const state = mkdtempSync(join(tmpdir(), "rule-daemon-status-state-"));

process.env.HOME = home;
process.env.RULE_MCP_STATE_DIR = state;

const { checkDaemonService, formatDaemonStatus } = await import("../index.js");

test.after(() => {
  rmSync(home, { recursive: true, force: true });
  rmSync(state, { recursive: true, force: true });
});

test("checkDaemonService names its platform on every arm", () => {
  const status = checkDaemonService();

  assert.ok(status.platform, "the platform key is set");
  assert.notEqual(status.platform, "undefined", "the platform is a real name");

  if (process.platform === "darwin") {
    assert.equal(status.platform, "macos", "darwin reports macos");
    assert.equal(status.service, "launchd", "darwin uses launchd");
    assert.ok(status.details.launchAgent, "the launch agent details are attached");
  }
});

test("formatDaemonStatus renders the platform and the native detail line", () => {
  const rendered = formatDaemonStatus();

  assert.match(rendered, /Platform: {3}\w/, "the platform renders as a name");
  assert.doesNotMatch(rendered, /Platform: {3}undefined/, "the platform is never undefined");
  assert.match(rendered, /PID file: {3}/, "the pid file line renders");

  if (process.platform === "darwin") {
    assert.match(rendered, /Plist: {6}/, "the macos arm renders its plist path");
  }
});

test("formatDaemonStatus reports a live pid when the pid file names one", () => {
  writeFileSync(join(state, "daemon.pid"), String(process.pid));

  const rendered = formatDaemonStatus();
  assert.match(rendered, new RegExp(`PID: {8}${process.pid}`), "the live pid renders");

  rmSync(join(state, "daemon.pid"), { force: true });
});
