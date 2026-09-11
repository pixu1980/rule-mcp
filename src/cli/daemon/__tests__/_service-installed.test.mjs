

/** The installed arms: plist/unit fixtures drive the native paths on macOS and Linux. */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";

const home = mkdtempSync(join(tmpdir(), "rule-daemon-installed-home-"));
const state = mkdtempSync(join(tmpdir(), "rule-daemon-installed-state-"));

process.env.HOME = home;
process.env.RULE_MCP_STATE_DIR = state;

const { checkDaemonService, formatDaemonStatus, LAUNCH_AGENT_PATH } = await import("../index.js");
const { SYSTEMD_UNIT_PATH } = await import("../_systemd.js");
const { actionStart, actionStop } = await import("../../commands/daemon/_process.js");

test.after(() => {
  rmSync(home, { recursive: true, force: true });
  rmSync(state, { recursive: true, force: true });
  delete process.env.RULE_MCP_STATE_DIR;
});

const out = async (fn) => {
  const chunks = [];
  const write = process.stdout.write;
  process.stdout.write = (chunk) => {
    chunks.push(String(chunk));

    return true;
  };

  try {
    await fn();
  } finally {
    process.stdout.write = write;
  }

  return chunks.join("");
};

const plantPlist = () => {
  mkdirSync(dirname(LAUNCH_AGENT_PATH), { recursive: true });
  writeFileSync(LAUNCH_AGENT_PATH, '<?xml version="1.0"?><plist/>');
};

const plantUnit = () => {
  mkdirSync(dirname(SYSTEMD_UNIT_PATH), { recursive: true });
  writeFileSync(SYSTEMD_UNIT_PATH, "[Unit]\n");
};

if (process.platform === "darwin") {
  test("an installed LaunchAgent takes the native start and stop arms", async () => {
    plantPlist();

    const status = checkDaemonService();
    assert.equal(status.installed, true, "the plist marks the service installed");
    assert.equal(status.service, "launchd", "the native service is named");

    const started = await out(() => actionStart({ dryRun: true }));
    assert.match(started, /Using native service \(launchd\)/, "the start takes the native arm");

    const stopped = await out(() => actionStop({ dryRun: true }));
    assert.match(stopped, /Service stopped/, "the stop takes the native arm");
  });

  test("an installed LaunchAgent renders its installed tick", () => {
    plantPlist();

    assert.match(formatDaemonStatus(), /Installed: {2}✓/, "the installed service ticks");
  });
}

if (process.platform === "linux") {
  test("an installed systemd unit takes the native start and stop arms", async () => {
    plantUnit();

    const status = checkDaemonService();
    assert.equal(status.installed, true, "the unit file marks the service installed");
    assert.equal(status.service, "systemd", "the native service is named");

    const started = await out(() => actionStart({ dryRun: true }));
    assert.match(started, /Using native service \(systemd\)/, "the start takes the native arm");

    const stopped = await out(() => actionStop({ dryRun: true }));
    assert.match(stopped, /Service stopped/, "the stop takes the native arm");
  });

  test("an installed systemd unit renders its unit line", () => {
    plantUnit();

    assert.match(formatDaemonStatus(), /Unit: {7}/, "the unit path renders");
  });
}

test("without a native service the start falls back to the process arm", async () => {
  if (process.platform === "darwin" || process.platform === "linux") {
    return;
  }

  const started = await out(() => actionStart({ dryRun: true }));

  assert.match(started, /Daemon: dry-run/, "the process arm reports the dry run");
});
