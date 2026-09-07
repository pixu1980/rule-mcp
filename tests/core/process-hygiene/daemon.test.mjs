/**
 * @module test/process-hygiene/daemon
 *
 * No process outlives the thing that needed it.
 *
 * Three leaks, each observed on a real machine before it was a test:
 *   - `daemon start` never returned, because the parent held the daemon's
 *     stdio pipes open while claiming to have detached from it.
 *   - `daemon stop` deleted the pid file after one SIGTERM, so a process that
 *     ignored the signal became unkillable through the CLI.
 *   - A stdio server whose client was killed kept running - reparented to init,
 *     spinning at 100% CPU on a socket with no peer, holding ~165 MB.
 *
 * Slow by nature: these spawn real processes and wait for them to die.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { alive, reap, reservePort, root, until, within } from "./_hygiene.fixture.mjs";

test("daemon start detaches instead of holding the daemon open", async (t) => {
  const stateDir = mkdtempSync(join(tmpdir(), "rule-daemon-detach-"));
  const port = await reservePort();
  let daemonPid = null;
  t.after(() => {
    if (daemonPid) {
      reap(daemonPid);
    }
    rmSync(stateDir, { recursive: true, force: true });
  });

  const starter = spawn(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `const { startDaemonProcess } = await import(${JSON.stringify(join(root, "src", "cli", "daemon", "index.js"))});
       const result = startDaemonProcess({});
       process.stdout.write(JSON.stringify(result));`,
    ],
    {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, RULE_MCP_STATE_DIR: stateDir, RULE_MCP_PORT: String(port) },
    },
  );
  let stdout = "";
  starter.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });

  const exited = await within(new Promise((resolve) => starter.once("exit", () => resolve(true))), 8000, false);
  if (!exited) {
    reap(starter.pid);
  }
  assert.equal(exited, true, "the process that spawned the daemon never exited");

  daemonPid = JSON.parse(stdout).pid;
  assert.equal(alive(daemonPid), true, "the daemon did not survive its parent");

  // The daemon still logs, even though the parent is not piping for it.
  const logFile = join(stateDir, "daemon.log");
  assert.equal(await until(() => existsSync(logFile) && readFileSync(logFile, "utf8").includes("listening")), true, "the detached daemon wrote no log");
});

test("daemon stop escalates to SIGKILL and only then forgets the pid", async (t) => {
  const stateDir = mkdtempSync(join(tmpdir(), "rule-daemon-stop-"));
  const pidFile = join(stateDir, "daemon.pid");
  t.after(() => rmSync(stateDir, { recursive: true, force: true }));

  // A daemon that ignores SIGTERM. The old stop path left this running forever
  // and removed the only record of its pid. It reports when its handler is
  // installed: signalled any earlier, it would die of the default action and
  // prove nothing.
  const stubborn = spawn(process.execPath, ["-e", "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000); console.log('ready')"], { stdio: ["ignore", "pipe", "ignore"] });
  t.after(() => reap(stubborn.pid));
  let ready = "";
  stubborn.stdout.on("data", (chunk) => {
    ready += chunk.toString();
  });
  assert.equal(await until(() => ready.includes("ready")), true, "the stubborn daemon never started");
  writeFileSync(pidFile, String(stubborn.pid));

  const previous = process.env.RULE_MCP_STATE_DIR;
  process.env.RULE_MCP_STATE_DIR = stateDir;
  try {
    const { stopDaemonProcess } = await import("../../../src/cli/daemon/index.js");
    // The pid is a child of this test process, so it stays in the process table
    // as a zombie until the runtime reaps it. Its exit event is the honest
    // signal that it is dead, which kill(pid, 0) is not.
    const exited = new Promise((resolve) => stubborn.once("exit", (code, signal) => resolve(signal ?? code)));
    const result = await stopDaemonProcess({});
    assert.equal(result.ok, true);
    assert.equal(result.action, "killed", "a daemon that ignores SIGTERM should be reported as killed");
    assert.equal(await within(exited, 3000, null), "SIGKILL", "the daemon that ignored SIGTERM was never killed");
    assert.equal(existsSync(pidFile), false, "the pid file outlived the daemon");
  } finally {
    if (previous === undefined) {
      delete process.env.RULE_MCP_STATE_DIR;
    } else {
      process.env.RULE_MCP_STATE_DIR = previous;
    }
  }
});

test("daemon stop takes the graceful path when the daemon has one", async (t) => {
  const stateDir = mkdtempSync(join(tmpdir(), "rule-daemon-graceful-"));
  const pidFile = join(stateDir, "daemon.pid");
  t.after(() => rmSync(stateDir, { recursive: true, force: true }));

  const polite = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
  t.after(() => reap(polite.pid));
  writeFileSync(pidFile, String(polite.pid));

  const previous = process.env.RULE_MCP_STATE_DIR;
  process.env.RULE_MCP_STATE_DIR = stateDir;
  try {
    const { stopDaemonProcess } = await import("../../../src/cli/daemon/index.js");
    const startedAt = Date.now();
    const result = await stopDaemonProcess({});
    assert.equal(result.action, "stopped");
    assert.ok(Date.now() - startedAt < 2000, "SIGTERM was honoured but stop still waited out the grace period");
    assert.equal(existsSync(pidFile), false);
  } finally {
    if (previous === undefined) {
      delete process.env.RULE_MCP_STATE_DIR;
    } else {
      process.env.RULE_MCP_STATE_DIR = previous;
    }
  }
});
