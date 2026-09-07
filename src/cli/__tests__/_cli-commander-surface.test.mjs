/**
 * Contract for the commander-backed CLI parsing layer.
 *
 * Guards exactly the behaviors the old hand-rolled parser (getArgument /
 * hasFlag over process.argv) got wrong or silently swallowed:
 *   - `--flag=value` syntax must parse (it was ignored before)
 *   - unknown options must fail loudly instead of being silently ignored
 *   - repeated options (--set A --set B) must all be collected
 *   - `--help` / unknown-command exit codes must be stable
 *
 * Every case spawns the real binary so the full parse→dispatch path is covered.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const BIN = fileURLToPath(new URL("../../../bin/rule-mcp.js", import.meta.url));

/** Run the CLI in a sandboxed HOME so nothing touches the real machine. */
function run(...args) {
  const fakeHome = mkdtempSync(join(tmpdir(), "rule-cli-surface-"));
  const env = {
    ...process.env,
    HOME: fakeHome,
    PI_CODING_AGENT_DIR: join(fakeHome, ".pi", "agent"),
    RULE_MCP_STATE_DIR: join(fakeHome, ".rule-mcp", "state"),
    RULE_MCP_NO_AUTOUPDATE: "1",
  };

  return spawnSync(process.execPath, [BIN, ...args], {
    cwd: new URL("../..", import.meta.url).pathname,
    env,
    encoding: "utf8",
  });
}

test("--flag=value syntax parses (install --agent=pi)", () => {
  const r = run("install", "--agent=pi", "--dry-run", "--json");
  assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert.equal(out.ok, true);
  // The old parser ignored "--agent=pi" and silently targeted EVERY agent.
  assert.deepEqual(Object.keys(out.installed), ["pi"], "only pi is targeted, not all agents");
});

test("unknown options are rejected with a non-zero exit", () => {
  const r = run("install", "--bogus", "--dry-run", "--json");
  assert.equal(r.status, 1, "an unknown option must fail the CLI");
  assert.match(`${r.stdout}\n${r.stderr}`, /bogus/i, "the offending option is named");
});

test("unknown commands exit non-zero", () => {
  const r = run("frobnicate");
  assert.equal(r.status, 1, "an unknown command must fail the CLI");
});

test("--help exits 0 and lists the command surface", () => {
  const r = run("--help");
  assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /install/, "root help lists the install command");
});

test("subcommand --help exits 0 and names its options", () => {
  const r = run("install", "--help");
  assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /--agent/, "install help names --agent");
});

test("--version prints the package version", () => {
  const r = run("--version");
  assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout.trim(), /^\d+\.\d+\.\d+$/);
});

test("config env collects every repeated --set value", () => {
  const home = mkdtempSync(join(tmpdir(), "rule-cli-surface-env-"));
  const env = {
    ...process.env,
    HOME: home,
    PI_CODING_AGENT_DIR: join(home, ".pi", "agent"),
    RULE_MCP_STATE_DIR: join(home, ".rule-mcp", "state"),
    RULE_MCP_NO_AUTOUPDATE: "1",
  };
  const spawn = (args) =>
    spawnSync(process.execPath, [BIN, ...args], {
      cwd: new URL("../..", import.meta.url).pathname,
      env,
      encoding: "utf8",
    });

  const r = spawn(["config", "env", "--set", "RULE_MCP_MINIMAL_TOOLS=1", "--set", "RULE_MCP_AUTO_ADR=1"]);
  assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);

  const listed = spawn(["config", "env", "--list"]);
  assert.equal(listed.status, 0, `${listed.stdout}\n${listed.stderr}`);
  assert.match(listed.stdout, /RULE_MCP_MINIMAL_TOOLS=1/);
  assert.match(listed.stdout, /RULE_MCP_AUTO_ADR=1/);
});

test("install --mode invalid value fails loudly", () => {
  const r = run("install", "--agent", "pi", "--mode", "bogus", "--dry-run", "--json");
  assert.equal(r.status, 1, "an invalid --mode must fail the CLI");
  assert.match(`${r.stdout}\n${r.stderr}`, /bogus/i, "the bad value is named");
});
