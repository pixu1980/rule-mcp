

/**
 * @module test/doctor-ui
 *
 * TDD coverage for the doctor command presentation layer.
 * Default doctor output should be terminal-oriented, with JSON available
 * explicitly for automation/export flows.
 */

import { strict as assert } from "node:assert";
import { formatDoctorTerminal } from "../index.js";

// Hermetic: color is decided by NO_COLOR / FORCE_COLOR / TTY, and a runner that
// exports FORCE_COLOR would turn the plain-output assertions into escape soup.
delete process.env.FORCE_COLOR;
delete process.env.NO_COLOR;

console.log("rule doctor UI test");

const report = {
  ok: true,
  version: "1.0.0",
  sdk: "1.29.0",
  node: "v24.18.0",
  platform: "darwin",
  arch: "arm64",
  entrypoint: "/repo/bin/rule-mcp.js",
  tools: ["rule", "rule_tool_check", "rule_tool_detect"],
  agentsConfigured: 2,
  agentsTotal: 3,
  agents: [
    { name: "claude", configured: true, validated: true, configFile: "/home/.claude.json" },
    { name: "cursor", configured: true, validated: false, configFile: "/home/.cursor/mcp.json" },
    { name: "copilot", configured: false, configFile: null },
  ],
  ides: [{ name: "VS Code", configured: true, configFile: "/repo/.vscode/mcp.json" }],
  models: { totalConfigured: 1 },
  stateDir: "/home/.rule-mcp/state",
  dataDir: "/home/.rule-mcp/data",
  configDir: "/home/.config/rule-mcp",
  daemon: {
    running: true,
    pid: 123,
    nativeService: {
      platform: "macos",
      service: "launchd",
      installed: true,
      loaded: true,
      running: true,
      pid: 123,
    },
  },
  unconfigured: ["copilot"],
};

const ui = formatDoctorTerminal(report);

assert.ok(!ui.trimStart().startsWith("{"), "default doctor UI must not be raw JSON");
assert.ok(ui.includes("🩺"), "UI should include doctor emoji in title");
assert.ok(ui.includes("🖥️"), "UI should include system emoji");
assert.ok(ui.includes("🧰"), "UI should include tools emoji");
assert.ok(ui.includes("🤖"), "UI should include agents emoji");
assert.ok(ui.includes("🚀"), "UI should include daemon emoji");
assert.ok(ui.includes("rule-mcp doctor"), "UI should include title");
assert.ok(ui.includes("System"), "UI should include system section");
assert.ok(ui.includes("MCP Tools"), "UI should include tools section");
assert.ok(ui.includes("Agents"), "UI should include agents section");
assert.ok(ui.includes("Daemon"), "UI should include daemon section");
assert.ok(ui.includes("rule_tool_check"), "UI should show tool examples");
assert.ok(ui.includes("claude"), "UI should show configured agents");
assert.ok(ui.includes("copilot"), "UI should show missing agents");
assert.ok(ui.includes("Use `rule-mcp doctor --json`"), "UI should advertise JSON export");

const previousForceColor = process.env.FORCE_COLOR;
process.env.FORCE_COLOR = "1";
const colorUi = formatDoctorTerminal(report);
if (previousForceColor === undefined) {
  delete process.env.FORCE_COLOR;
} else {
  process.env.FORCE_COLOR = previousForceColor;
}
assert.ok(/\x1B\[[0-9;]*m/.test(colorUi), "UI should emit ANSI colors when FORCE_COLOR is set");

console.log("  ✅ doctor defaults to colorful emoji Terminal UI with JSON export hint");
