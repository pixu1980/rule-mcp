/**
 * The service templates and the paths that never touch the machine: plist and
 * unit generation, the wrapper script, dry runs, and the not-installed exits.
 *
 * HOME and the state dir are redirected before the module loads, so the paths
 * these build point inside a scratch directory rather than at the real one.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const home = mkdtempSync(join(tmpdir(), "rule-mcp-service-home-"));
const state = mkdtempSync(join(tmpdir(), "rule-mcp-service-state-"));

process.env.HOME = home;
process.env.RULE_MCP_STATE_DIR = state;

const { escapePlist, generateWrapperScript, resolveEntrypoint } = await import("../_service-shared.js");
const { generateLaunchAgentPlist } = await import("../_launchd-plist.js");
const { generateSystemdUnit, systemdQuote } = await import("../_systemd-unit.js");
const { LAUNCH_AGENT_PATH, installLaunchAgent, uninstallLaunchAgent, checkLaunchAgent } = await import("../_launchd.js");
const { SYSTEMD_UNIT_PATH, installSystemdService, uninstallSystemdService, checkSystemdService } = await import("../_systemd.js");
const { getWindowsServiceCommand, installWindowsService } = await import("../_windows-service.js");

test.after(() => {
  rmSync(home, { recursive: true, force: true });
  rmSync(state, { recursive: true, force: true });
});

test("resolveEntrypoint points at this checkout's binary and serves over SSE", () => {
  const entrypoint = resolveEntrypoint();

  assert.equal(entrypoint.node, process.execPath, "the service runs the node that installed it");
  assert.ok(entrypoint.script.endsWith(join("bin", "rule-mcp.js")), `unexpected script path: ${entrypoint.script}`);
  assert.ok(existsSync(entrypoint.script), "the entrypoint it names must exist");
  assert.deepEqual(entrypoint.command.slice(2), ["serve", "--transport", "sse"], "a service always serves over SSE");
});

test("escapePlist escapes the three characters XML cannot carry raw", () => {
  assert.equal(escapePlist("a & b < c > d"), "a &amp; b &lt; c &gt; d");
  assert.equal(escapePlist("/Users/me/bin"), "/Users/me/bin", "an ordinary path is untouched");
});

test("the wrapper script is valid bash and forwards its arguments", () => {
  const script = generateWrapperScript(resolveEntrypoint());
  const file = join(home, "wrapper.sh");
  writeFileSync(file, script);

  assert.equal(execFileSync("bash", ["-n", file], { encoding: "utf8" }), "", "bash -n must accept the wrapper");
  assert.match(script, /set -euo pipefail/, "the wrapper fails loudly");
  assert.match(script, /if \[\[ \$# -gt 0 \]\]/, "arguments are forwarded when given");
  assert.match(script, /RULE_MCP_DAEMON=1/, "the daemon marks itself in the environment");
  assert.match(script, /serve --transport sse/, "the default run serves over SSE");
});

test("the LaunchAgent plist names the label, the wrapper and the log", () => {
  const plist = generateLaunchAgentPlist(resolveEntrypoint());

  assert.match(plist, /^<\?xml version="1\.0" encoding="UTF-8"\?>/, "a plist opens with the XML declaration");
  assert.match(plist, /<key>Label<\/key>\s*<string>io\.github\.rule-mcp\.rule-mcp<\/string>/, "the label is the one the adapter looks for");
  assert.match(plist, /rule-mcpd/, "the Program is the wrapper, so Login Items shows the daemon name");
  assert.match(plist, /<key>KeepAlive<\/key>\s*<true\/>/, "the agent is restarted when it dies");
  assert.ok(plist.includes(join(state, "daemon.log")), "the log goes to the configured state dir");
  assert.ok(existsSync(state), "generating the plist prepares the state dir");
});

test("the systemd unit restarts on failure and is hardened", () => {
  const unit = generateSystemdUnit(resolveEntrypoint());

  assert.match(unit, /\[Unit]/, "the unit has its sections");
  assert.match(unit, /ExecStart=.*serve --transport sse/, "the unit serves over SSE");
  assert.match(unit, /Restart=on-failure/, "a crash is retried");
  assert.match(unit, /NoNewPrivileges=yes/, "the service cannot escalate");
  assert.match(unit, /ProtectHome=read-only/, "the service cannot write the home directory");
  assert.ok(unit.includes(`ReadWritePaths=${state}`), "only the state dir is writable");
  assert.ok(unit.includes(`append:${join(state, "daemon.log")}`), "both streams append to the log");
});

test("a systemd unit quotes only the arguments that need it", () => {
  const unit = generateSystemdUnit({ node: "/usr/bin/node", script: "/opt/my app/cli.js", command: ["/usr/bin/node", "/opt/my app/cli.js", "serve"] });

  assert.match(unit, /ExecStart=\/usr\/bin\/node "\/opt\/my app\/cli\.js" serve/, "a path with a space is quoted, the rest is not");
  assert.match(unit, /Environment=PATH=.*:\/usr\/bin/, "the node bin dir is appended to PATH");
});

test("systemdQuote escapes an embedded quote and backslash, so the argument cannot split", () => {
  assert.equal(systemdQuote("/usr/bin/node"), "/usr/bin/node", "an ordinary path is left alone");
  assert.equal(systemdQuote('/opt/a"b/cli.js'), String.raw`"/opt/a\"b/cli.js"`, "an embedded quote is escaped");
  assert.equal(systemdQuote(String.raw`C:\odd\node.exe`), String.raw`"C:\\odd\\node.exe"`, "an embedded backslash is escaped");
});

test("a failed service install reports the exit, never the command line", () => {
  const result = installWindowsService({});

  assert.equal(result.ok, false, "the install failed");
  assert.match(result.error, /^Failed to create service \(exit /, result.error);
  assert.equal(result.error.includes(resolveEntrypoint().node), false, "the node path is not echoed back");
  assert.equal(result.error.includes("sc create"), false, "the command line is not echoed back");
});

test("a dry run reports what it would do without touching the machine", () => {
  assert.deepEqual(installLaunchAgent({ dryRun: true }), { ok: true, path: LAUNCH_AGENT_PATH, action: "dry-run (plist not written)" });
  assert.deepEqual(installSystemdService({ dryRun: true }), { ok: true, path: SYSTEMD_UNIT_PATH, action: "dry-run (unit not written)" });

  const windows = installWindowsService({ dryRun: true });
  assert.equal(windows.ok, true);
  assert.match(windows.action, /^dry-run/, "windows previews the service it would create");
  assert.ok(windows.action.includes(getWindowsServiceCommand()), "and it shows the exact command line");

  assert.equal(existsSync(LAUNCH_AGENT_PATH), false, "no plist was written");
  assert.equal(existsSync(SYSTEMD_UNIT_PATH), false, "no unit was written");
});

test("uninstalling what was never installed is a no-op, not an error", () => {
  for (const [name, result] of [
    ["launchd", uninstallLaunchAgent()],
    ["systemd", uninstallSystemdService()],
  ]) {
    assert.equal(result.ok, true, `${name}: removing nothing is a success`);
    assert.equal(result.action, "not-installed", `${name}: and it says so`);
  }

  // The Windows arm is deliberately not called here: `sc query ... 2>nul` is
  // Windows shell syntax, so running it on POSIX writes a file named `nul` into
  // the working directory and proves nothing about Windows either way.
});

test("a status check on a machine with no service installed reports absence", () => {
  const launchd = checkLaunchAgent();
  assert.equal(launchd.installed, false, "no plist in the scratch home");
  assert.equal(launchd.loaded, false);
  assert.equal(launchd.pid, null);
  assert.equal(launchd.path, LAUNCH_AGENT_PATH);

  const systemd = checkSystemdService();
  assert.equal(systemd.installed, false, "no unit in the scratch home");
  assert.equal(systemd.enabled, false);
  assert.equal(systemd.active, false);
  assert.equal(systemd.pid, null);
});
