/** Assemble the doctor report: SDK, agents, daemon, environment, telemetry. */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { listTools } from "../../tools/router/index.js";
import { getRuntimePaths } from "../paths.js";
import { detectInstalledAgents } from "../install.js";
import { checkDaemonService, WRAPPER_SCRIPT_PATH } from "../daemon/index.js";
import { getTokenStats } from "../../core/telemetry/_token-stats.js";
import { validateAgentConfigs } from "./_detect-agents.js";
import { detectIdeConfigs, detectModelConfig, detectStoredModelKeys, getEnvironmentInfo } from "./_detect-env.js";
import { formatDoctorTerminal } from "./_format.js";
import { getSdkVersion } from "./_sdk-version.js";

/** Assemble and print the full doctor report. */
export async function runDoctor(telemetry = false) {
  const p = getRuntimePaths();
  const __dirname = fileURLToPath(new URL(".", import.meta.url));
  const package_ = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8"));

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
  const modelsConfigured = modelEnvironment.filter((m) => m.configured).length + modelFiles.filter((m) => m.configured).length;

  // Environment
  const environment = getEnvironmentInfo();

  // Surface snapshot (tools / resources / prompts / skills)
  let surface = { tools: 0, resources: 0, prompts: 0, skills: 0 };
  try {
    const { loadAllSkills } = await import("../../core/skills/_skills.js");
    await loadAllSkills(true);
    const { listTools } = await import("../../tools/router/index.js");
    const { listResources } = await import("../../resources/index.js");
    const { listPrompts } = await import("../../prompts/index.js");
    const len = (r) => (Array.isArray(r) ? r.length : (r.tools ?? r.resources ?? r.prompts).length);
    surface.tools = len(await listTools({}));
    surface.resources = len(await listResources({}));
    surface.prompts = len(await listPrompts());
  } catch {
    /* surface probe is best-effort */
  }

  const { readdirSync } = await import("node:fs");
  try {
    surface.skills = readdirSync(new URL("../../../skills", import.meta.url)).filter((d) => d.startsWith("rule-")).length;
  } catch {
    /* no skills dir next to the module (installed elsewhere) */
  }

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
    tokenSavings: getTokenStats(),
    surface,
    sdk: getSdkVersion(),
    node: environment.node,
    platform: environment.platform,
    arch: environment.arch,

    entrypoint: fileURLToPath(new URL("../../../bin/rule-mcp.js", import.meta.url)),

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
      stdio: `${process.execPath} ${fileURLToPath(new URL("../../../bin/rule-mcp.js", import.meta.url))} serve`,
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
