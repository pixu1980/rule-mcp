

/** runDoctor: the assembled report, the telemetry arm and the live-pid arm. */
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const home = mkdtempSync(join(tmpdir(), "rule-mcp-doctor-run-"));
const state = mkdtempSync(join(tmpdir(), "rule-mcp-doctor-run-state-"));

process.env.HOME = home;
process.env.RULE_MCP_STATE_DIR = state;

const { runDoctor } = await import("../index.js");

test.after(() => {
  rmSync(home, { recursive: true, force: true });
  rmSync(state, { recursive: true, force: true });
});

test("the report carries the surface, agents and daemon sections", async () => {
  const report = await runDoctor();

  assert.equal(report.ok, true, "the report is assembled");
  assert.ok(report.version, "the version reads from package.json");
  assert.ok(report.surface.tools > 0, "the tool surface is probed");
  assert.ok(Array.isArray(report.agents), "the agents are validated");
  assert.equal(report.daemon.running, false, "no daemon runs in the sandbox");
  assert.equal(report.telemetry, undefined, "no telemetry block without the flag");
});

test("the telemetry flag adds the anonymous block and a live pid is reported", async () => {
  writeFileSync(join(state, "daemon.pid"), String(process.pid));

  const report = await runDoctor(true);
  assert.equal(report.daemon.running, true, "a live pid counts as running");
  assert.equal(report.daemon.pid, process.pid, "the pid is reported");
  assert.ok(report.telemetry, "the telemetry block is present");
  assert.match(report.telemetry_note, /no personal data/, "the note states the scope");

  rmSync(join(state, "daemon.pid"), { force: true });
});

test("a stale pid file reads as not running", async () => {
  writeFileSync(join(state, "daemon.pid"), "999999999");

  const report = await runDoctor();
  assert.equal(report.daemon.running, false, "a dead pid is not a daemon");

  rmSync(join(state, "daemon.pid"), { force: true });
});
