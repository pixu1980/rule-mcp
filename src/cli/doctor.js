/**
 * @module cli/doctor
 *
 * System health check for rule-mcp.
 * Reports server version, SDK version, Node version,
 * registered tools, installed agents (across all 23+ supported),
 * runtime paths, and IDE/model configuration status.
 *
 * Inspired by tokensave's doctor architecture:
 *   - Per-agent health checks
 *   - Binary path validation
 *   - Configuration file verification
 *   - Cross-platform support
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir, platform, arch } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { listTools } from "../tools/router.js";
import { getRuntimePaths } from "./paths.js";
import { detectInstalledAgents } from "./install.js";
import { checkDaemonService, WRAPPER_SCRIPT_PATH } from "./daemon.js";
import { banner, color, section } from "./tui.js";

const HOME = homedir();

/**
 * Get the installed SDK version string.
 * @returns {string} - e.g. "1.29.0" or "unknown"
 */
export function getSdkVersion() {
  try {
    const sdkPackagePath = new URL("../../node_modules/@modelcontextprotocol/sdk/package.json", import.meta.url);
    const sdkPackage = JSON.parse(readFileSync(sdkPackagePath, "utf8"));
    return sdkPackage.version || "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Check agent-specific configuration details beyond basic detection.
 * Validates that the MCP server entry is well-formed.
 *
 * @param {Array} agents - Agent detection results
 * @returns {Array} - Agents with additional validation
 */
function validateAgentConfigs(agents) {
  return agents.map((agent) => {
    if (!agent.configured || !agent.configFile) {
      return agent;
    }

    try {
      const content = readFileSync(agent.configFile, "utf8");

      // VS Code uses `servers`, not the generic `mcpServers` key.
      if (agent.name === "vscode") {
        try {
          const json = JSON.parse(content);
          const mcpEntry = json.servers?.["rule-mcp"];
          return {
            ...agent,
            validated: !!mcpEntry,
            command: mcpEntry?.command || null,
            args: mcpEntry?.args || null,
            url: mcpEntry?.url || null,
          };
        } catch {
          return { ...agent, validated: false, parseError: "Invalid JSON" };
        }
      }

      // Claude uses .claude.json with mcpServers
      if (agent.name === "claude" && agent.configFile.endsWith(".claude.json")) {
        try {
          const json = JSON.parse(content);
          const mcpEntry = json.mcpServers?.["rule-mcp"];
          return {
            ...agent,
            validated: !!mcpEntry,
            command: mcpEntry?.command || null,
            args: mcpEntry?.args || null,
          };
        } catch {
          return { ...agent, validated: false, parseError: "Invalid JSON" };
        }
      }

      // Generic JSON config check
      if (agent.configFile.endsWith("mcp.json")) {
        try {
          const json = JSON.parse(content);
          const mcpEntry = json.mcpServers?.["rule-mcp"];
          return {
            ...agent,
            validated: !!mcpEntry,
            command: mcpEntry?.command || null,
            args: mcpEntry?.args || null,
          };
        } catch {
          return { ...agent, validated: false, parseError: "Invalid JSON" };
        }
      }

      return { ...agent, validated: true };
    } catch {
      return { ...agent, validated: false, readError: "Cannot read file" };
    }
  });
}

/**
 * Check if IDE-specific configs exist.
 *
 * @returns {Array<{ name: string, configured: boolean, configFile: string|null }>}
 */
function detectIdeConfigs() {
  const vscodeUserConfigPath =
    platform() === "darwin"
      ? join(HOME, "Library", "Application Support", "Code", "User", "mcp.json")
      : platform() === "win32"
        ? join(process.env.APPDATA || join(HOME, "AppData", "Roaming"), "Code", "User", "mcp.json")
        : join(HOME, ".config", "Code", "User", "mcp.json");
  let skillsCount = 0;
  try {
    if (existsSync("skills")) {
      skillsCount = readdirSync("skills").filter((d) => d.startsWith("rule")).length;
    }
  } catch {
    /* skills dir may be absent in packaged installs */
  }

  const checks = [
    { name: "Skills directory", ok: skillsCount >= 60, detail: `${skillsCount} skills` },
    { name: "Cursor (IDE)", path: join(HOME, ".cursor", "mcp.json") },
    { name: "Windsurf (IDE)", path: join(HOME, ".windsurf", "mcp.json") },
    { name: "VS Code User", path: vscodeUserConfigPath },
  ];

  // Platform-specific IDE checks
  if (platform() === "darwin") {
    // macOS: Check for JetBrains Toolbox
    const jetbrainsToolbox = join(HOME, "Library", "Application Support", "JetBrains", "Toolbox");
    checks.push({ name: "JetBrains Toolbox", path: jetbrainsToolbox });
  }

  return checks.map(({ name, path, ok, detail }) => {
    if (typeof ok === "boolean") {
      return { name, configured: ok, configFile: null, detail };
    }
    return {
      name,
      configured: existsSync(path),
      configFile: existsSync(path) ? path : null,
    };
  });
}

/**
 * Check model provider environment variable configuration.
 * Detects which API keys are set in the environment.
 *
 * @returns {Array<{ provider: string, configured: boolean, keyName: string }>}
 */
function detectModelConfig() {
  const modelKeys = [
    { provider: "OpenAI", keyName: "OPENAI_API_KEY" },
    { provider: "Anthropic", keyName: "ANTHROPIC_API_KEY" },
    { provider: "Google Gemini", keyName: "GEMINI_API_KEY" },
    { provider: "xAI Grok", keyName: "XAI_API_KEY" },
    { provider: "Mistral AI", keyName: "MISTRAL_API_KEY" },
    { provider: "AWS Bedrock", keyName: "AWS_ACCESS_KEY_ID" },
    { provider: "Cohere", keyName: "CO_API_KEY" },
    { provider: "Together AI", keyName: "TOGETHER_API_KEY" },
    { provider: "OpenRouter", keyName: "OPENROUTER_API_KEY" },
    { provider: "DeepSeek", keyName: "DEEPSEEK_API_KEY" },
  ];

  return modelKeys.map(({ provider, keyName }) => ({
    provider,
    keyName,
    configured: !!process.env[keyName],
  }));
}

/**
 * Check locally stored API key files.
 *
 * @returns {Array<{ provider: string, configured: boolean, file: string|null }>}
 */
function detectStoredModelKeys() {
  const configDir = join(HOME, ".config", "rule-mcp");
  const keyFiles = ["openai-key", "anthropic-key", "gemini-key", "xai-key"];

  return keyFiles.map((file) => {
    const fullPath = join(configDir, file);
    const exists = existsSync(fullPath);
    return {
      provider: file
        .replace("-key", "")
        .replaceAll("-", " ")
        .replaceAll(/\b\w/g, (c) => c.toUpperCase()),
      configured: exists,
      file: exists ? fullPath : null,
    };
  });
}

/**
 * Get environment info for diagnostics.
 *
 * @returns {object}
 */
function getEnvironmentInfo() {
  return {
    platform: platform(),
    arch: arch(),
    home: HOME,
    node: process.version,
    cwd: process.cwd(),
    shell: process.env.SHELL || process.env.ComSpec || "unknown",
    terminal: process.env.TERM || "unknown",
  };
}

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
function statusIcon(ok) {
  return ok ? color("✅", "green") : color("❌", "red");
}

function agentIcon(agent) {
  if (!agent.configured) {
    return color("○", "dim");
  }
  return agent.validated === false ? color("⚠️", "yellow") : color("✅", "green");
}

function yesNo(value) {
  return value ? color("yes", "green") : color("no", "red");
}

function truncate(value, max = 96) {
  const text = String(value ?? "");
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

/**
 * Format a doctor report for humans in the terminal.
 * JSON remains available through `rule-mcp doctor --json`.
 *
 * @param {object} report - Result from runDoctor()
 * @returns {string}
 */
export function formatDoctorTerminal(report) {
  const native = report.daemon?.nativeService || {};
  const configuredAgents = (report.agents || []).filter((agent) => agent.configured);
  const missingAgents = (report.unconfigured || []).slice(0, 10);
  const sampleTools = (report.tools || []).slice(0, 12);

  const lines = [
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
    section("MCP Tools", "🧰"),
    `Registered:  ${color((report.tools || []).length, "green")}`,
    `Examples:    ${sampleTools.map((tool) => color(tool, "cyan")).join(", ")}${(report.tools || []).length > sampleTools.length ? color(", …", "dim") : ""}`,
    "",
    section("Agents", "🤖"),
    `Configured:  ${color(report.agentsConfigured, "green")}/${report.agentsTotal}`,
  ];

  for (const agent of configuredAgents.slice(0, 12)) {
    lines.push(
      `  ${agentIcon(agent)} ${color(agent.name.padEnd(12), agent.validated === false ? "yellow" : "bold")} ${color(truncate(agent.configFile || "", 90), "dim")}`,
    );
  }
  if (configuredAgents.length > 12) {
    lines.push(color(`  … ${configuredAgents.length - 12} more configured agents`, "dim"));
  }
  if (missingAgents.length > 0) {
    lines.push(
      `⚠️  ${color("Missing", "yellow")}: ${missingAgents.map((agent) => color(agent, "yellow")).join(", ")}${(report.unconfigured || []).length > missingAgents.length ? color(", …", "dim") : ""}`,
    );
  }

  lines.push(
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
    "",
    section("Models", "🧠"),
    `Configured providers: ${color(report.models?.totalConfigured ?? 0, (report.models?.totalConfigured ?? 0) > 0 ? "green" : "yellow")}`,
    "",
    section("Runtime paths", "📁"),
    `State:       ${color(truncate(report.stateDir, 100), "dim")}`,
    `Data:        ${color(truncate(report.dataDir, 100), "dim")}`,
    `Config:      ${color(truncate(report.configDir, 100), "dim")}`,
    "",
    section("Automation", "⚙️"),
    `📤 Use ${color("`rule-mcp doctor --json`", "cyan")} to print machine-readable JSON.`,
    `💾 Use ${color("`rule-mcp doctor --json-out <file>`", "cyan")} to export JSON while keeping this UI.`,
  );

  return lines.join("\n") + "\n";
}

export function runDoctor(telemetry = false) {
  const p = getRuntimePaths();
  // eslint-disable-next-line no-unused-vars
  const __dirname = fileURLToPath(new URL(".", import.meta.url));
  const package_ = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));

  // Detect + validate agent configs
  const detected = detectInstalledAgents();
  const validated = validateAgentConfigs(detected);
  const configured = validated.filter((a) => a.configured);
  const missing = validated.filter((a) => !a.configured);

  // IDE configs
  const ideConfigs = detectIdeConfigs();

  // Model provider configs
  const modelEnvironment = detectModelConfig();
  const modelFiles = detectStoredModelKeys();
  const modelsConfigured =
    modelEnvironment.filter((m) => m.configured).length + modelFiles.filter((m) => m.configured).length;

  // Environment
  const environment = getEnvironmentInfo();

  // Daemon status
  let isDaemonRunning = false;
  let daemonPid = null;
  if (existsSync(p.pidFile)) {
    try {
      const pid = Number(readFileSync(p.pidFile, "utf8").trim());
      process.kill(pid, 0);
      isDaemonRunning = true;
      daemonPid = pid;
    } catch {
      // Stale PID
    }
  }

  const report = {
    ok: true,
    version: package_.version,
    sdk: getSdkVersion(),
    node: environment.node,
    platform: environment.platform,
    arch: environment.arch,

    entrypoint: fileURLToPath(new URL("../../bin/rule-mcp.js", import.meta.url)),

    tools: listTools().map((t) => t.name),

    // Agent detection
    agents: validated,
    agentsConfigured: configured.length,
    agentsTotal: detected.length,

    // IDE configs
    ides: ideConfigs,

    // Model configuration
    models: {
      env: modelEnvironment,
      files: modelFiles,
      totalConfigured: modelsConfigured,
    },

    // Runtime
    stateDir: p.stateDir,
    dataDir: p.dataDir,
    configDir: p.configDir,
    daemon: {
      running: isDaemonRunning,
      pid: daemonPid,
      pidFile: p.pidFile,
      logFile: p.logFile,
      nativeService: checkDaemonService(),
    },

    // Paths
    commands: {
      stdio: `${process.execPath} ${fileURLToPath(new URL("../../bin/rule-mcp.js", import.meta.url))} serve`,
      global: "rule-mcp serve",
      daemon: "rule-mcp daemon start",
      install: "rule-mcp install --agent all",
    },

    // Unconfigured agents (quick reference)
    unconfigured: missing.map((a) => a.name),
  };

  if (telemetry) {
    report.telemetry = {
      version: package_.version,
      node: environment.node,
      platform: environment.platform,
      arch: environment.arch,
      tools: report.tools.length,
      agents: report.agentsConfigured,
      models: modelsConfigured,
      timestamp: new Date().toISOString(),
    };
    report.telemetry_note = "Anonymous usage stats - no personal data collected. Disable by omitting --telemetry.";
  }

  return report;
}
