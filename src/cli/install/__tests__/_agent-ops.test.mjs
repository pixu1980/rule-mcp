

/** install/uninstall agent dispatch: redirects, sweeps, unsupported and remote modes. */
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const home = mkdtempSync(join(tmpdir(), "rule-mcp-agentops-"));
const ENTRY = "/tmp/fake-rule-mcp.js";

test.before(() => {
  process.env.HOME = home;
  process.env.RULE_MCP_HOME = join(home, "mcp");
});

test.after(() => rmSync(home, { recursive: true, force: true }));

const { installAgent, uninstallAgent } = await import("../index.js");

test("installAgent dry-runs one agent and refuses an unsupported name", () => {
  const result = installAgent({ agent: "claude", entrypoint: ENTRY, dryRun: true });
  assert.equal(result.ok, true, "a claude install succeeds");
  assert.equal(result.dryRun, true, "the dry run is reported");
  assert.ok(result.installed.claude, "the agent result is present");

  assert.throws(() => installAgent({ agent: "ghost-agent", entrypoint: ENTRY }), /Unsupported agent/, "an unknown agent throws");
});

test("a deprecated name redirects to its successor with a warning", () => {
  const result = installAgent({ agent: "windsurf", entrypoint: ENTRY, dryRun: true });
  assert.deepEqual(result.warnings, ['"windsurf" is deprecated - use "devin" instead.'], "the warning names the successor");
  assert.ok(result.installed.devin, "the successor is installed");
});

test("--agent all sweeps the live catalog", () => {
  const result = installAgent({ agent: "all", entrypoint: ENTRY, dryRun: true });
  const names = Object.keys(result.installed);
  assert.ok(names.length >= 5, "every catalog agent is attempted");
  assert.equal(result.warnings, undefined, "the sweep carries no redirect warning");
});

test("a remote mode is refused for non-remote agents", () => {
  const result = installAgent({ agent: "claude", entrypoint: ENTRY, mode: "daemon", dryRun: true });
  assert.match(result.installed.claude.error, /supported only for Pi and VS Code/, "the mode restriction is stated");
});

test("uninstallAgent dry-runs and refuses unknowns", () => {
  const result = uninstallAgent({ agent: "claude", dryRun: true });
  assert.ok(result.uninstalled.claude, "the uninstall result is present");

  assert.throws(() => uninstallAgent({ agent: "ghost-agent" }), /Unsupported agent/, "an unknown agent throws on uninstall too");
});

test("a deprecated name redirects on uninstall with the same warning", () => {
  const result = uninstallAgent({ agent: "windsurf", dryRun: true });
  assert.deepEqual(result.warnings, ['"windsurf" is deprecated - use "devin" instead.'], "the warning names the successor");
  assert.ok(result.uninstalled.devin, "the successor is the one uninstalled");
});

test("a real install writes the manifest into the sandboxed home", () => {
  const result = installAgent({ agent: "claude", entrypoint: ENTRY });
  assert.equal(result.dryRun, false, "this run is real");
  assert.ok(result.manifest, "the manifest path is reported");
  assert.ok(result.manifest.startsWith(home) || result.manifest.startsWith(join(home, "mcp")), "the manifest lands in the fake home");
});
