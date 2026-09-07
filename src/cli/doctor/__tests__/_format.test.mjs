/** formatDoctorTerminal and its helpers: every branch renders, nothing stays dark. */
import { strict as assert } from "node:assert";
import test from "node:test";

import { agentIcon, formatDoctorTerminal, statusIcon, truncate, yesNo } from "../_format.js";

// Hermetic: color is decided by NO_COLOR / FORCE_COLOR / TTY; a runner exporting
// FORCE_COLOR would turn plain-substring assertions into escape soup.
delete process.env.FORCE_COLOR;
delete process.env.NO_COLOR;

test("statusIcon maps ok and not-ok to green and red", () => {
  assert.match(statusIcon(true), /✅/);
  assert.match(statusIcon(false), /❌/);
});

test("agentIcon renders configured, validated-false and unconfigured states", () => {
  assert.match(agentIcon({ configured: true, validated: true }), /✅/);
  assert.match(agentIcon({ configured: true, validated: false }), /⚠️/);
  assert.match(agentIcon({ configured: false }), /○/);
});

test("yesNo renders both sides", () => {
  assert.match(yesNo(true), /yes/);
  assert.match(yesNo(false), /no/);
});

test("truncate shortens over the limit and passes short or absent values through", () => {
  assert.equal(truncate("x".repeat(200), 20), "x".repeat(19) + "...");
  assert.equal(truncate("short", 10), "short");
  assert.equal(truncate(undefined, 10), "");
});

const minimal = {
  ok: true,
  version: "1.0.0",
  sdk: "1.2.3",
  node: "24.0.0",
  platform: "linux",
  arch: "x64",
  entrypoint: "/bin/rule-mcp.js",
  agentsTotal: 15,
  agentsConfigured: 2,
  tools: [...Array.from({ length: 14 }, (_, i) => `rule_tool_${i}`)],
  agents: [
    { name: "claude", configured: true, validated: true, configFile: "~/.claude.json" },
    { name: "windsurf", configured: true, validated: false, configFile: "" },
  ],
  unconfigured: Array.from({ length: 12 }, (_, i) => `agent-${i}`),
  daemon: {
    running: true,
    pid: 4242,
    pidFile: "/tmp/rule-mcp.pid",
    logFile: "/tmp/rule-mcp.log",
    nativeService: { service: "rule-mcpd", platform: "macos", installed: true, loaded: true, running: true, pid: 4243 },
  },
  models: { totalConfigured: 3 },
  stateDir: "/tmp/state",
  dataDir: "/tmp/data",
  configDir: "/tmp/config",
};

test("formatDoctorTerminal renders a full healthy report", () => {
  const ui = formatDoctorTerminal(minimal);

  assert.match(ui, /healthy/);
  assert.match(ui, /Status: ✅/);
  assert.match(ui, /rule_tool_0, rule_tool_1/);
  assert.match(ui, /\.\.\./); // tools overflow marker
  assert.match(ui, /claude/);
  assert.match(ui, /⚠️/); // validated-false agent icon
  assert.match(ui, /Missing/);
  assert.match(ui, /agent-0, agent-1/);
  assert.match(ui, /\.\.\./); // unconfigured overflow marker
  assert.match(ui, /running \(pid 4242\)/);
  assert.match(ui, /rule-mcpd/);
  assert.match(ui, /Login Items/); // macos-only suffix
  assert.match(ui, /(pid 4243)/); // native.pid suffix
  assert.match(ui, /Configured providers: 3/);
});

test("formatDoctorTerminal renders a bare broken report without optional sections", () => {
  const ui = formatDoctorTerminal({
    ok: false,
    version: "1.0.0",
    sdk: "1.2.3",
    node: "24.0.0",
    platform: "win32",
    arch: "x64",
    entrypoint: "",
    agentsTotal: 0,
    agentsConfigured: 0,
  });

  assert.match(ui, /needs attention/);
  assert.match(ui, /Status: ❌/);
  assert.doesNotMatch(ui, /rule_tool_/, "no tools means no example rows");
  assert.doesNotMatch(ui, /Login Items/, "non-macos platform drops the login-item suffix");
  assert.match(ui, /not running via pid file/);
  assert.match(ui, /Service: +none/);
  assert.match(ui, /Configured providers: 0/);
  assert.doesNotMatch(ui, /Missing/, "no unconfigured agents means no missing row");
  assert.doesNotMatch(ui, /\(pid/, "no daemon pid means no pid suffix");
});

test("formatDoctorTerminal renders more than 12 configured agents with the dim overflow line", () => {
  const agents = Array.from({ length: 14 }, (_, i) => ({
    name: `agent-${i}`,
    configured: true,
    validated: true,
    configFile: `cfg-${i}`,
  }));

  const ui = formatDoctorTerminal({
    ...minimal,
    agents,
    tools: [],
    unconfigured: ["one", "two"],
    daemon: { running: false, nativeService: {} },
    models: { totalConfigured: 0 },
    agentsConfigured: 14,
  });

  assert.match(ui, /2 more configured agents/);
  assert.doesNotMatch(ui, /rule_tool_/);
  assert.match(ui, /Missing/);
  assert.doesNotMatch(ui, /\(pid/);
  assert.match(ui, /Configured providers: 0/);
});