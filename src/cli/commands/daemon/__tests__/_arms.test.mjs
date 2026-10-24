

/** daemonCommand arms: status, logs, dry-run lifecycle, enable/disable, unknown. */
import { strict as assert } from "node:assert";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const home = mkdtempSync(join(tmpdir(), "rule-mcp-daemon-arms-home-"));
const state = mkdtempSync(join(tmpdir(), "rule-mcp-daemon-arms-state-"));

process.env.HOME = home;
process.env.RULE_MCP_STATE_DIR = state;

const { daemonCommand } = await import("../index.js");

/** Run one daemon action and capture what it printed. */
async function run(opts) {
  const lines = [];
  const write = process.stdout.write;
  process.stdout.write = (chunk) => {
    lines.push(String(chunk));

    return true;
  };

  try {
    await daemonCommand(opts);
  } finally {
    process.stdout.write = write;
  }

  return lines.join("");
}

test.after(() => {
  rmSync(home, { recursive: true, force: true });
  rmSync(state, { recursive: true, force: true });
});

test("an unknown action fails loudly with the available arms", async () => {
  await assert.rejects(() => daemonCommand({ action: "explode" }), /Unknown daemon action: explode/, "the unknown arm names itself");
});

test("status is the default action and renders the block", async () => {
  const out = await run({});
  assert.match(out, /Platform: {3}\w/, "the status block renders");
});

test("logs says so when there is no log yet, then prints the log", async () => {
  const empty = await run({ action: "logs" });
  assert.match(empty, /No logs yet/, "an absent log is stated");

  writeFileSync(join(state, "daemon.log"), "daemon said hello\n");
  const full = await run({ action: "logs" });
  assert.match(full, /daemon said hello/, "the log content prints");
});

test("install and uninstall honor the dry-run flag", async () => {
  const installed = await run({ action: "install", dryRun: true });
  assert.match(installed, /Installing \w+ daemon service/, "the install arm announces its platform");
  assert.equal(existsSync(join(home, "Library", "LaunchAgents")), false, "nothing is written on a dry run");

  const removed = await run({ action: "uninstall", dryRun: true });
  assert.match(removed, /Removing \w+ daemon service/, "the uninstall arm announces its platform");
});

test("start and stop fall back to the process daemon when no service is installed", async () => {
  const started = await run({ action: "start", dryRun: true });
  assert.match(started, /Daemon/, "the start arm reports");

  const stopped = await run({ action: "stop", dryRun: true });
  assert.match(stopped, /Daemon (stopped|not running)/, "the stop arm reports");
});

test("start reports an already-running daemon from the pid file", async () => {
  writeFileSync(join(state, "daemon.pid"), String(process.pid));

  const out = await run({ action: "start", dryRun: true });
  assert.match(out, new RegExp(String(process.pid)), "the live pid is reported");

  rmSync(join(state, "daemon.pid"), { force: true });
});

test("enable and disable walk the native service arm harmlessly in a fake home", async () => {
  const enabled = await run({ action: "enable" });
  assert.match(enabled, /Enabling service:|No native service file/, "the enable arm reports");

  const disabled = await run({ action: "disable" });
  assert.match(disabled, /Disabling service:|No native service file/, "the disable arm reports");
});
