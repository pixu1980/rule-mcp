

/** Render the doctor report for the terminal. */
import { banner, color, section } from "../index.js";
import { WRAPPER_SCRIPT_PATH } from "../daemon/index.js";

/**
 * Run a full health check and return a JSON-serializable report.
 * Covers:
 *   - Server version, SDK, Node
 *   - All 23+ agents with validation
 *   - IDE configurations
 *   - Model provider API keys (env vars + stored files)
 *   - Runtime paths
 *   - Registered tools
 *   - Daemon status
 *
 * @param {boolean} [telemetry=false] - Include anonymous usage stats
 * @returns {object} - Comprehensive health report
 */
export function statusIcon(ok) {
  return ok ? color("✅", "green") : color("❌", "red");
}

/** Icon for one agent row. */
export function agentIcon(agent) {
  if (!agent.configured) {
    return color("○", "dim");
  }

  return agent.validated === false ? color("⚠️", "yellow") : color("✅", "green");
}

/** Render a boolean as yes/no. */
export function yesNo(value) {
  return value ? color("yes", "green") : color("no", "red");
}

/** Truncate a value for one report line. */
export function truncate(value, max = 96) {
  const text = String(value ?? "");

  return text.length > max ? text.slice(0, max - 1) + "..." : text;
}

/** Banner, status line, and the System section. */
export function systemSection(report) {
  return [
    banner("🩺 rule-mcp doctor", report.ok ? "healthy" : "needs attention"),
    "",
    `${color("Status", "bold")}: ${statusIcon(report.ok)} ${report.ok ? color("healthy", "green") : color("needs attention", "red")}`,
    "",
    section("System", "🖥️"),
    `Version:     ${color(report.version, "green")}`,
    `MCP SDK:     ${color(report.sdk, "cyan")}`,
    `Node:        ${color(report.node, "cyan")}`,
    `Platform:    ${color(`${report.platform}/${report.arch}`, "magenta")}`,
    `Entrypoint:  ${color(truncate(report.entrypoint, 100), "dim")}`,
    "",
  ];
}

/** The MCP Tools section: registered count and a sample of names. */
export function toolsSection(report) {
  const sampleTools = (report.tools || []).slice(0, 12);

  return [
    section("MCP Tools", "🧰"),
    `Registered:  ${color((report.tools || []).length, "green")}`,
    `Examples:    ${sampleTools.map((tool) => color(tool, "cyan")).join(", ")}${(report.tools || []).length > sampleTools.length ? color(", ...", "dim") : ""}`,
    "",
  ];
}

/** The Agents section: configured rows, an overflow note, and a missing-agents note. */
export function agentsSection(report) {
  const configuredAgents = (report.agents || []).filter((agent) => agent.configured);
  const missingAgents = (report.unconfigured || []).slice(0, 10);
  const lines = [section("Agents", "🤖"), `Configured:  ${color(report.agentsConfigured, "green")}/${report.agentsTotal}`];

  for (const agent of configuredAgents.slice(0, 12)) {
    lines.push(`  ${agentIcon(agent)} ${color(agent.name.padEnd(12), agent.validated === false ? "yellow" : "bold")} ${color(truncate(agent.configFile || "", 90), "dim")}`);
  }

  if (configuredAgents.length > 12) {
    lines.push(color(`  ... ${configuredAgents.length - 12} more configured agents`, "dim"));
  }

  if (missingAgents.length > 0) {
    lines.push(
      `⚠️  ${color("Missing", "yellow")}: ${missingAgents.map((agent) => color(agent, "yellow")).join(", ")}${(report.unconfigured || []).length > missingAgents.length ? color(", ...", "dim") : ""}`,
    );
  }

  return lines;
}

/** The Daemon section: pid-file process state and the native service. */
export function daemonSection(report) {
  const native = report.daemon?.nativeService || {};

  return [
    "",
    section("Daemon", "🚀"),
    `Process:     ${report.daemon?.running ? color(`running (pid ${report.daemon.pid})`, "green") : color("not running via pid file", "yellow")}`,
    `Service:     ${color(native.service || "none", "cyan")} on ${color(native.platform || report.platform, "magenta")}`,
    `Installed:   ${yesNo(native.installed)}`,
    `Loaded:      ${yesNo(native.loaded)}`,
    `Running:     ${yesNo(native.running)}${native.pid ? ` ${color(`(pid ${native.pid})`, "dim")}` : ""}`,
    `Login Item:  ${color("rule-mcpd", native.platform === "macos" ? "cyan" : "dim")}${native.platform === "macos" ? color(" (daemon wrapper in Login Items)", "dim") : ""}`,
    `PID file:    ${color(truncate(report.daemon?.pidFile || "", 100), "dim")}`,
    `Log file:    ${color(truncate(report.daemon?.logFile || "", 100), "dim")}`,
    `Wrapper:     ${color(truncate(WRAPPER_SCRIPT_PATH, 100), "dim")}`,
  ];
}

/** The Models section: how many providers have a configured key. */
export function modelsSection(report) {
  return ["", section("Models", "🧠"), `Configured providers: ${color(report.models?.totalConfigured ?? 0, (report.models?.totalConfigured ?? 0) > 0 ? "green" : "yellow")}`];
}

/** The Runtime paths section. */
export function pathsSection(report) {
  return [
    "",
    section("Runtime paths", "📁"),
    `State:       ${color(truncate(report.stateDir, 100), "dim")}`,
    `Data:        ${color(truncate(report.dataDir, 100), "dim")}`,
    `Config:      ${color(truncate(report.configDir, 100), "dim")}`,
  ];
}

/** The Automation section: how to get machine-readable output. */
export function automationSection() {
  return [
    "",
    section("Automation", "⚙️"),
    `📤 Use ${color("`rule-mcp doctor --json`", "cyan")} to print machine-readable JSON.`,
    `💾 Use ${color("`rule-mcp doctor --json-out <file>`", "cyan")} to export JSON while keeping this UI.`,
  ];
}

/**
 * Format a doctor report for humans in the terminal.
 * JSON remains available through `rule-mcp doctor --json`.
 *
 * @param {object} report - Result from runDoctor()
 * @returns {string}
 */
export function formatDoctorTerminal(report) {
  const lines = [
    ...systemSection(report),
    ...toolsSection(report),
    ...agentsSection(report),
    ...daemonSection(report),
    ...modelsSection(report),
    ...pathsSection(report),
    ...automationSection(),
  ];

  return lines.join("\n") + "\n";
}
