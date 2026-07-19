/**
 * @module cli/install
 *
 * Agent/IDE/model installation support for rule-mcp.
 * Generates MCP configuration files for ALL supported coding agents.
 *
 * Inspired by tokensave's architecture:
 *   18+ agents with individual install/uninstall/healthcheck per agent.
 *   Shared utilities for JSON/TOML file manipulation with atomic writes + backups.
 *   Cross-platform paths for macOS, Linux, Windows.
 *
 * Supported agents (matching tokensave's full list):
 *   claude, codex, cursor, copilot, gemini,
 *   cline, roo, zed, opencode, antigravity, windsurf,
 *   kilo, kimi, vibe, grok, droid, kiro, qwen,
 *   pi, vscode, jetbrains, neovim, emacs
 *
 * Supports stdio, native daemon/SSE, and Docker deployment modes.
 * Stdio can use a local Node entrypoint or a globally installed command.
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, rmSync } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getOrCreateSseBearerToken } from "../transport/sse-auth.js";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Internal MCP server name used in agent configurations. */
const serverName = "rule-mcp";

/**
 * Full list of supported agents.
 * Matching tokensave's 18+ agents: all coding agents, IDEs, and platforms.
 */
const allAgents = [
  // ── Coding Agents ──
  "claude", // Anthropic Claude Code
  "codex", // OpenAI Codex CLI
  "cursor", // Cursor editor
  "copilot", // GitHub Copilot
  "gemini", // Google Gemini CLI
  "cline", // Cline VSCode extension
  "roo", // Roo Code
  "zed", // Zed editor
  "opencode", // OpenCode
  "antigravity", // Antigravity (formerly Windsurf)
  "windsurf", // Windsurf (legacy name)
  "kilo", // Kilo CLI
  "kimi", // Moonshot Kimi CLI
  "vibe", // Mistral Vibe
  "grok", // xAI Grok Build
  "droid", // Factory Droid
  "kiro", // AWS Kiro
  "qwen", // Qwen Code (Alibaba)
  "pi", // Pi coding agent (pi.dev)

  // ── IDEs ──
  "vscode", // VS Code (user-level config)
  "jetbrains", // JetBrains IDEs (IntelliJ, WebStorm, etc.)
  "neovim", // Neovim (via MCP plugin)
  "emacs", // Emacs (via mcp.el)
];

/** Agents with verified HTTP/SSE MCP configuration support. */
const remoteModeAgents = new Set(["pi", "vscode"]);

const normalizeInstallMode = (mode = "stdio") => {
  const normalized = mode === "sse" ? "daemon" : mode;
  if (!new Set(["stdio", "daemon", "docker"]).has(normalized)) {
    throw new Error(`Unsupported install mode: "${mode}"`);
  }
  return normalized;
};

// ─── Platform detection ─────────────────────────────────────────────────────

const IS_WINDOWS = platform() === "win32";
const IS_MACOS = platform() === "darwin";
const IS_LINUX = platform() === "linux";

const HOME = homedir();
const COMMAND_TEMPLATE_PATH = fileURLToPath(new URL("../../prompts/rule-mcp.md", import.meta.url));

// ─── File helpers ───────────────────────────────────────────────────────────

/** Safely read a text file, returning empty string if it doesn't exist. */
const readText = (file) => (existsSync(file) ? readFileSync(file, "utf8") : "");

/** Write a file with backup and atomic write. Skips if dryRun. Throws on null content. */
const atomicWrite = ({ file, content, dryRun }) => {
  if (content === null) throw new Error(`Cannot write null content to ${file} — parse error in source`);
  if (dryRun) return file;
  if (existsSync(file)) backupFile(file);
  const tmp = file + ".tmp." + Date.now();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(tmp, content, "utf8");
  try {
    rmSync(file, { force: true });
  } catch {}
  writeFileSync(file, content, "utf8");
  try {
    rmSync(tmp, { force: true });
  } catch {}
  return file;
};

/** Write a file, optionally as a dry-run (no actual write). @deprecated Use atomicWrite for safety. */
const writeText = ({ file, content, dryRun }) => {
  if (content === null) throw new Error(`Cannot write null content to ${file} — parse error in source`);
  if (!dryRun) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
  return file;
};

/** Remove a file if it exists. */
const removeFile = (file) => {
  if (existsSync(file)) rmSync(file, { force: true });
};

/** Create a backup copy of a file before modifying it. Returns backup path. */
const backupFile = (file) => {
  if (!existsSync(file)) return null;
  const backup = `${file}.bak`;
  try {
    const content = readFileSync(file);
    writeFileSync(backup, content);
    return backup;
  } catch {
    return null;
  }
};

// ─── MCP config builder ─────────────────────────────────────────────────────

/**
 * Build a command config for stdio-based MCP servers.
 *
 * Modes:
 *   - stdio (default): client spawns the MCP process
 *   - daemon / sse: client connects to the local SSE daemon
 *   - docker: client connects to the Docker-exposed local SSE endpoint
 *
 * @param {string} entrypoint — Path to the server entry script
 * @param {{ global?: boolean, mode?: "stdio"|"daemon"|"sse"|"docker", port?: number }} [opts]
 * @returns {object}
 */
/** Detect the globally installed rule-mcp binary, if any. */
const resolveGlobalBinary = () => {
  // Check common pnpm/Homebrew locations (fast path, no shell overhead).
  const HOME = homedir();
  const candidates = [
    join(HOME, "Library", "pnpm", "bin", "rule-mcp"),
    "/opt/homebrew/bin/rule-mcp",
    "/usr/local/bin/rule-mcp",
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  // Fall back to PATH scan, but exclude local node_modules/.bin (project-local shims).
  try {
    const out = execSync("command -v rule-mcp 2>/dev/null || which rule-mcp 2>/dev/null", {
      encoding: "utf8",
      timeout: 2000,
    }).trim();
    if (out && existsSync(out) && !out.includes("node_modules/.bin")) return out;
  } catch {
    // Not found — fall back to local Node entrypoint.
  }
  return null;
};

/**
 * Environment variable config directory and file.
 */
const ENV_CONFIG_DIR = join(homedir(), ".config", "rule-mcp");
const ENV_CONFIG_FILE = join(ENV_CONFIG_DIR, "env.json");

/**
 * Read saved RULE_MCP_* environment variable preferences from disk.
 * Returns {} if no config file exists.
 */
function readEnvConfig() {
  try {
    if (!existsSync(ENV_CONFIG_FILE)) return {};
    return JSON.parse(readFileSync(ENV_CONFIG_FILE, "utf8"));
  } catch {
    return {};
  }
}

/**
 * Save RULE_MCP_* environment variable preferences to disk.
 */
export function writeEnvConfig(env) {
  mkdirSync(ENV_CONFIG_DIR, { recursive: true });
  writeFileSync(ENV_CONFIG_FILE, JSON.stringify(env, null, 2) + "\n", "utf8");
}

/**
 * Resolve effective environment variables for a command:
 *   opts.env > saved config > {}
 */
function resolveEnv(opts = {}) {
  const saved = readEnvConfig();
  return { ...saved, ...(opts.env || {}) };
}

const cmdConfig = (entrypoint, opts = {}) => {
  const mode = normalizeInstallMode(opts.mode);
  const env = resolveEnv(opts);

  if (mode === "daemon" || mode === "docker") {
    const port = Number.isInteger(opts.port) && opts.port > 0 && opts.port < 65_536 ? opts.port : 38000;
    const token = getOrCreateSseBearerToken();
    return {
      url: `http://127.0.0.1:${port}/sse`,
      headers: { Authorization: `Bearer ${token}` },
      directTools: true,
      lifecycle: "keep-alive",
    };
  }

  // Build stdio config
  let config;
  const globalBin = resolveGlobalBinary();
  if (globalBin) {
    const home = homedir();
    const portableBin = globalBin.startsWith(home + "/")
      ? "~" + globalBin.slice(home.length)
      : globalBin;
    config = { command: portableBin, args: ["serve"], directTools: true, lifecycle: "keep-alive", type: "stdio" };
  } else {
    config = { command: process.execPath, args: [entrypoint, "serve"], directTools: true, lifecycle: "keep-alive" };
  }

  // Attach env vars if any (supported by MCP stdio transport)
  if (Object.keys(env).length > 0) {
    config.env = env;
  }

  return config;
};

/**
 * Return the MCP server config object with the server name key.
 *
 * @param {string} entrypoint — Path to the server entry script
 * @param {{ global?: boolean, mode?: "stdio"|"daemon"|"sse"|"docker", port?: number }} [opts]
 * @returns {Record<string, object>}
 */
export function mcpServerConfig(entrypoint, opts = {}) {
  return { [serverName]: cmdConfig(entrypoint, opts) };
}

// ─── JSON helpers ───────────────────────────────────────────────────────────

/** Parse JSON, returning null on failure (fail-closed). */
const parseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

/** Serialize JSON with pretty formatting. */
const toJson = (obj) => `${JSON.stringify(obj, null, 2)}\n`;

/**
 * Upsert an MCP server entry in a JSON config file.
 * Returns null if the file contains invalid JSON.
 */
const LEGACY_SERVER_NAME = "pix_galaxy_mcp";

const upsertJsonServer = (current, config) => {
  const json = current.trim() ? parseJson(current) : {};
  if (json === null) return null;
  json.mcpServers = json.mcpServers ?? {};
  json.mcpServers[serverName] = config;
  // Clean up legacy underscore key so the old entry doesn't survive.
  if (json.mcpServers[LEGACY_SERVER_NAME]) {
    delete json.mcpServers[LEGACY_SERVER_NAME];
    if (Object.keys(json.mcpServers).length === 0) delete json.mcpServers;
  }
  return toJson(json);
};

/**
 * Remove an MCP server entry from a JSON config file.
 * Returns null if the file contains invalid JSON.
 */
const removeJsonServer = (current) => {
  if (!current.trim()) return current;
  const json = parseJson(current);
  if (json === null) return null;
  for (const key of [serverName, LEGACY_SERVER_NAME]) {
    if (json.mcpServers?.[key]) {
      delete json.mcpServers[key];
      if (Object.keys(json.mcpServers).length === 0) delete json.mcpServers;
    }
  }
  return Object.keys(json).length > 0 ? toJson(json) : "";
};

/**
 * Upsert an MCP server entry in VS Code-style JSON config
 * (which uses `servers` instead of `mcpServers`).
 * Returns null if the file contains invalid JSON.
 */
const upsertVscode = (current, config) => {
  const json = current.trim() ? parseJson(current) : {};
  if (json === null) return null;
  json.servers = json.servers ?? {};
  // VS Code owns `servers`; remove only this server from the `mcpServers` key.
  for (const key of [serverName, LEGACY_SERVER_NAME]) {
    if (json.mcpServers?.[key]) {
      delete json.mcpServers[key];
      if (Object.keys(json.mcpServers).length === 0) delete json.mcpServers;
    }
  }
  // Migrate from legacy underscore name.
  if (json.servers[LEGACY_SERVER_NAME]) delete json.servers[LEGACY_SERVER_NAME];
  json.servers[serverName] = { ...config, type: config.url ? "http" : "stdio" };
  return toJson(json);
};

/**
 * Remove an MCP server entry from VS Code-style JSON config.
 * Returns null if the file contains invalid JSON.
 */
const removeVscodeServer = (current) => {
  if (!current.trim()) return current;
  const json = parseJson(current);
  if (json === null) return null;
  for (const key of [serverName, LEGACY_SERVER_NAME]) {
    if (json.servers?.[key]) {
      delete json.servers[key];
      if (Object.keys(json.servers).length === 0) delete json.servers;
    }
    if (json.mcpServers?.[key]) {
      delete json.mcpServers[key];
      if (Object.keys(json.mcpServers).length === 0) delete json.mcpServers;
    }
  }
  return Object.keys(json).length > 0 ? toJson(json) : "";
};

// ─── TOML helpers ───────────────────────────────────────────────────────────

/** Upsert a TOML block. */
const upsertTomlBlock = (current, blockName, block) => {
  const escapedName = blockName.replaceAll(".", "\\.");
  const re = new RegExp(`\\n?\\[${escapedName}\\][\\s\\S]*?(?=\\n\\[[^\\]]+\\]|$)`, "m");
  const nb = `[${blockName}]\n${block.trim()}\n`;
  return re.test(current) ? current.replace(re, `\n${nb}`) : `${current.trimEnd()}\n\n${nb}`;
};

/** Remove a TOML block by name. */
const removeTomlBlock = (current, blockName) => {
  const re = new RegExp(`\\n?\\[${blockName.replaceAll(".", "\\.")}\\][\\s\\S]*?(?=\\n\\[[^\\]]+\\]|$)`, "m");
  return re.test(current) ? current.replace(re, "") : current;
};

// ─── Instruction helpers ────────────────────────────────────────────────────

/**
 * Append rule-mcp instruction marker to agent instructions file.
 * Uses HTML comments so it's compatible with Markdown and HTML-based formats.
 *
 * @param {string} current — Current file content
 * @returns {string} — Updated content with instruction marker
 */
const appendInstruction = (current) => {
  const marker = "<!-- rule-mcp -->";
  if (current.includes(marker)) return current;
  return `${current.trimEnd()}\n\n${marker}\nBefore writing any frontend/styling code, call \`rule\` to route the task to the correct rule skill. Follow rule galaxy principles: zero CSS classes, zero inline styles, semantic HTML, external CSS via adoptedStyleSheets. Available tools: rule, pix_component, pix_check, pix_search, pix_scaffold, pix_process_adr.\n<!-- /rule-mcp -->\n`;
};

/** Remove the rule-mcp instruction marker. */
const removeInstruction = (current) => {
  const marker = "<!-- rule-mcp -->";
  if (!current.includes(marker)) return current;
  return current.replace(/\n*<!-- rule-mcp -->[\s\S]*?<!-- \/rule-mcp -->\n*/g, "").trimEnd();
};

const commandTemplate = () => readText(COMMAND_TEMPLATE_PATH);
const commandBody = () =>
  commandTemplate()
    .replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "")
    .trim();
const geminiCommand = () =>
  [
    'description = "Route coding work through rule-mcp"',
    'prompt = """',
    commandBody().replaceAll("$ARGUMENTS", "{{args}}"),
    '"""',
    "",
  ].join("\n");
const copilotAgent = () =>
  [
    "---",
    "name: rule-mcp",
    "description: Route work through rule MCP skills and enforce validation before completion.",
    "---",
    "",
    commandBody(),
    "",
  ].join("\n");

// ─── Agent installers ───────────────────────────────────────────────────────

/** @param {{ entrypoint: string, dryRun: boolean, global?: boolean }} */
const installClaude = ({ entrypoint, dryRun, global }) => {
  const file = join(HOME, ".claude.json");
  const mdFile = join(HOME, ".claude", "CLAUDE.md");
  const commandFile = join(HOME, ".claude", "commands", "rule-mcp.md");
  return [
    writeText({ file, content: upsertJsonServer(readText(file), cmdConfig(entrypoint, { global })), dryRun }),
    writeText({ file: mdFile, content: appendInstruction(readText(mdFile)), dryRun }),
    writeText({ file: commandFile, content: commandTemplate(), dryRun }),
  ];
};

/** @param {{ entrypoint: string, dryRun: boolean, global?: boolean }} */
const installCodex = ({ entrypoint, dryRun, global }) => {
  const file = join(HOME, ".codex", "config.toml");
  const cfg = cmdConfig(entrypoint, { global });
  const block = `command = "${cfg.command.replaceAll("\\", "\\\\")}"\nargs = [${cfg.args.map((a) => `"${a.replaceAll("\\", "\\\\")}"`).join(", ")}]`;
  const mdFile = join(HOME, ".codex", "AGENTS.md");
  return [
    writeText({ file, content: upsertTomlBlock(readText(file), `mcp_servers.${serverName}`, block), dryRun }),
    writeText({ file: mdFile, content: appendInstruction(readText(mdFile)), dryRun }),
  ];
};

/** @param {{ entrypoint: string, dryRun: boolean, global?: boolean }} */
const installCursor = ({ entrypoint, dryRun, global }) => {
  const files = [];
  const cursorGlobal = join(HOME, ".cursor", "mcp.json");
  const cursorCommand = join(process.cwd(), ".cursor", "commands", "rule-mcp.md");
  files.push(
    writeText({
      file: cursorGlobal,
      content: upsertJsonServer(readText(cursorGlobal), cmdConfig(entrypoint, { global })),
      dryRun,
    }),
  );
  files.push(writeText({ file: cursorCommand, content: commandTemplate(), dryRun }));
  // Also write to .cursorrules
  const cursorRules = join(HOME, ".cursorrules");
  if (!existsSync(cursorRules) || !readText(cursorRules).includes("rule")) {
    writeText({
      file: cursorRules,
      content: appendInstruction(readText(cursorRules)),
      dryRun,
    });
  }
  return files;
};

/** @param {{ entrypoint: string, dryRun: boolean, global?: boolean }} */
const installCopilot = ({ entrypoint, dryRun, global }) => {
  const hostsDir = join(HOME, ".config", "github-copilot");
  const hostsFile = join(hostsDir, "hosts.json");
  const agentFile = join(HOME, ".copilot", "agents", "rule-mcp.agent.md");
  const current = readText(hostsFile);
  const json = current.trim() ? parseJson(current) : {};
  json[`copilot-mcp-${serverName}`] = cmdConfig(entrypoint, { global });
  return [
    writeText({ file: hostsFile, content: toJson(json), dryRun }),
    writeText({ file: agentFile, content: copilotAgent(), dryRun }),
  ];
};

/** @param {{ entrypoint: string, dryRun: boolean, global?: boolean }} */
const installGemini = ({ entrypoint, dryRun, global }) => {
  const file = join(HOME, ".gemini", "settings.json");
  const mdFile = join(HOME, ".gemini", "GEMINI.md");
  const commandFile = join(HOME, ".gemini", "commands", "rule-mcp.toml");
  return [
    writeText({ file, content: upsertJsonServer(readText(file), cmdConfig(entrypoint, { global })), dryRun }),
    writeText({ file: mdFile, content: appendInstruction(readText(mdFile)), dryRun }),
    writeText({ file: commandFile, content: geminiCommand(), dryRun }),
  ];
};

/** @param {{ entrypoint: string, dryRun: boolean, global?: boolean, mode?: "stdio"|"daemon"|"sse"|"docker" }} */
const installPi = ({ entrypoint, dryRun, global, mode }) => {
  // Pi uses $PI_CODING_AGENT_DIR/mcp.json or ~/.pi/agent/mcp.json
  const piDir = process.env.PI_CODING_AGENT_DIR ? join(process.env.PI_CODING_AGENT_DIR) : join(HOME, ".pi", "agent");
  const file = join(piDir, "mcp.json");
  const promptFile = join(piDir, "prompts", "rule-mcp.md");
  return [
    writeText({ file, content: upsertJsonServer(readText(file), cmdConfig(entrypoint, { global, mode })), dryRun }),
    writeText({ file: promptFile, content: commandTemplate(), dryRun }),
  ];
};

/** Return the VS Code user-level global config directory. */
const vscodeGlobalDir = () => {
  if (process.platform === "darwin") return join(HOME, "Library", "Application Support", "Code", "User");
  if (process.platform === "win32")
    return join(process.env.APPDATA || join(HOME, "AppData", "Roaming"), "Code", "User");
  return join(HOME, ".config", "Code", "User");
};

/** @param {{ entrypoint: string, dryRun: boolean, global?: boolean, mode?: "stdio"|"daemon"|"sse"|"docker" }} */
const installVscode = ({ entrypoint, dryRun, global, mode }) => {
  // The universal installer is user-level. Workspace config is opt-in outside it.
  const globalFile = join(vscodeGlobalDir(), "mcp.json");
  return [
    writeText({
      file: globalFile,
      content: upsertVscode(readText(globalFile), cmdConfig(entrypoint, { global, mode })),
      dryRun,
    }),
  ];
};

/** @param {{ entrypoint: string, dryRun: boolean, global?: boolean }} */
const installJetbrains = ({ entrypoint, dryRun, global }) => {
  const file = join(process.cwd(), ".idea", "mcp.json");
  return [writeText({ file, content: upsertJsonServer(readText(file), cmdConfig(entrypoint, { global })), dryRun })];
};

/** @param {{ entrypoint: string, dryRun: boolean, global?: boolean }} */
const installNeovim = ({ entrypoint, dryRun, global }) => {
  const nvimDir = IS_WINDOWS ? join(HOME, "AppData", "Local", "nvim") : join(HOME, ".config", "nvim");
  const file = join(nvimDir, "mcp.json");
  return [writeText({ file, content: upsertJsonServer(readText(file), cmdConfig(entrypoint, { global })), dryRun })];
};

/** @param {{ entrypoint: string, dryRun: boolean, global?: boolean }} */
const installEmacs = ({ entrypoint, dryRun, global }) => {
  // Emacs uses init.el or early-init.el
  const emacsDir = IS_WINDOWS ? join(HOME, "AppData", "Roaming", ".emacs.d") : join(HOME, ".emacs.d");
  const initFile = join(emacsDir, "init.el");
  const cfg = cmdConfig(entrypoint, { global });
  const emacsConfig = `;; rule-mcp\n(setq mcp-servers '((\n  "${serverName}" . (\n    (command . "${cfg.command}")\n    (args . ${JSON.stringify(cfg.args)})\n    (directTools . t)\n    (lifecycle . "keep-alive")))))\n`;
  return [
    writeText({
      file: initFile,
      content: readText(initFile).includes("rule")
        ? readText(initFile)
        : `${readText(initFile).trimEnd()}\n\n${emacsConfig}`,
      dryRun,
    }),
  ];
};

/**
 * Create a generic installer for agents that use standard JSON config files.
 *
 * @param {string} name — Agent name
 * @param {object} [opts]
 * @param {string} [opts.configPath] — Custom config path (default: ~/.config/<name>/mcp.json)
 * @param {string} [opts.instructionsPath] — Custom instructions path
 * @returns {Function} Installer function
 */
const createGenericInstaller = (name, opts = {}) => {
  const configPath = opts.configPath || join(HOME, ".config", name, "mcp.json");
  const instructionsPath = opts.instructionsPath || join(HOME, ".config", name, "instructions.md");

  return ({ entrypoint, dryRun, global }) => {
    const results = [
      writeText({
        file: configPath,
        content: upsertJsonServer(readText(configPath), cmdConfig(entrypoint, { global })),
        dryRun,
      }),
    ];
    // Also write instruction file for agents that support it
    if (opts.instructionsPath !== false) {
      results.push(writeText({ file: instructionsPath, content: appendInstruction(""), dryRun }));
    }
    return results;
  };
};

// ─── Agent registry ─────────────────────────────────────────────────────────

/** Map of agent names to their installer functions. */
const installers = {
  // Coding Agents
  claude: installClaude,
  codex: installCodex,
  cursor: installCursor,
  copilot: installCopilot,
  gemini: installGemini,
  pi: installPi,

  // Generic JSON config agents
  cline: createGenericInstaller("cline"),
  roo: createGenericInstaller("roo"),
  zed: createGenericInstaller("zed"),
  opencode: createGenericInstaller("opencode"),
  antigravity: createGenericInstaller("antigravity"),
  windsurf: createGenericInstaller("windsurf"),
  kilo: createGenericInstaller("kilo"),
  kimi: createGenericInstaller("kimi"),
  vibe: createGenericInstaller("vibe"),
  grok: createGenericInstaller("grok"),
  droid: createGenericInstaller("droid", { configPath: join(HOME, ".config", "factory", "mcp.json") }),
  kiro: createGenericInstaller("kiro"),
  qwen: createGenericInstaller("qwen"),

  // IDEs
  vscode: installVscode,
  jetbrains: installJetbrains,
  neovim: installNeovim,
  emacs: installEmacs,
};

/**
 * Write/update installed.md manifest in the state directory.
 *
 * @param {string[]} agents — List of installed agent names
 * @param {string} entrypoint — Server entry point path
 * @param {boolean} global — Whether using global install
 * @param {"stdio"|"daemon"|"docker"} mode — MCP transport/deployment mode
 * @returns {string} — Manifest file path
 */
function writeInstalledManifest(agents, entrypoint, global, mode) {
  const stateDir = join(HOME, ".local", "share", "rule-mcp");
  mkdirSync(stateDir, { recursive: true });
  const manifestPath = join(stateDir, "installed.md");
  const timestamp = new Date().toISOString();
  const lines = [
    "# rule-mcp — Installation Manifest",
    "",
    `Generated: ${timestamp}`,
    `Install source: ${global ? "global" : "local"}`,
    `Transport: ${mode}`,
    `Entry point: ${entrypoint}`,
    `Node version: ${process.version}`,
    `Platform: ${platform()}`,
    "",
    "## Installed Agents",
    "",
  ];
  for (const name of agents) {
    lines.push(`- [x] ${name}`);
  }
  lines.push("", "---", "", `To reinstall: \`rule-mcp install --agent all --mode ${mode}\``);
  writeFileSync(manifestPath, lines.join("\n") + "\n");
  return manifestPath;
}

/**
 * Install rule-mcp into one or more agents.
 * Writes an installed.md manifest after successful installation.
 *
 * @param {{ agent: string, entrypoint: string, dryRun?: boolean, force?: boolean, global?: boolean, mode?: "stdio"|"daemon"|"sse"|"docker" }} opts
 * @returns {{ ok: boolean, dryRun: boolean, global: boolean, installed: object, manifest?: string }}
 */
export const installAgent = ({ agent, entrypoint, dryRun = false, force = false, global = false, mode = "stdio", env = {} }) => {
  const normalizedMode = normalizeInstallMode(mode);
  const selected = agent === "all" ? allAgents : [agent];

  if (!installers[agent] && agent !== "all") {
    throw new Error(`Unsupported agent: "${agent}". Supported agents: ${allAgents.join(", ")}`);
  }

  const result = {};
  for (const name of selected) {
    if (!installers[name]) {
      result[name] = { error: `No installer for "${name}"` };
      continue;
    }
    if (normalizedMode !== "stdio" && !remoteModeAgents.has(name)) {
      result[name] = {
        error: `Install mode "${normalizedMode}" is currently supported only for Pi and VS Code; use stdio for ${name}.`,
      };
      continue;
    }
    try {
      result[name] = installers[name]({ entrypoint, dryRun, global, mode: normalizedMode });
    } catch (err) {
      result[name] = { error: err.message };
    }
  }

  const ok = Object.values(result).every((entry) => !entry?.error);
  if (!dryRun) {
    const manifestPath = writeInstalledManifest(selected, entrypoint, global, normalizedMode);
    return { ok, dryRun, global, mode: normalizedMode, installed: result, manifest: manifestPath };
  }
  return { ok, dryRun, global, mode: normalizedMode, installed: result };
};

// ─── Uninstallers ───────────────────────────────────────────────────────────

/** @param {{ dryRun: boolean }} */
const uninstallClaude = ({ dryRun }) => {
  const file = join(HOME, ".claude.json");
  const mdFile = join(HOME, ".claude", "CLAUDE.md");
  const commandFile = join(HOME, ".claude", "commands", "rule-mcp.md");
  if (!dryRun) removeFile(commandFile);
  return [
    writeText({ file, content: removeJsonServer(readText(file)), dryRun }),
    writeText({ file: mdFile, content: removeInstruction(readText(mdFile)), dryRun }),
    commandFile,
  ];
};

/** @param {{ dryRun: boolean }} */
const uninstallCodex = ({ dryRun }) => {
  const file = join(HOME, ".codex", "config.toml");
  const mdFile = join(HOME, ".codex", "AGENTS.md");
  return [
    writeText({ file, content: removeTomlBlock(readText(file), `mcp_servers.${serverName}`), dryRun }),
    writeText({ file: mdFile, content: removeInstruction(readText(mdFile)), dryRun }),
  ];
};

/** @param {{ dryRun: boolean }} */
const uninstallCursor = ({ dryRun }) => {
  const cursorGlobal = join(HOME, ".cursor", "mcp.json");
  const commandFile = join(process.cwd(), ".cursor", "commands", "rule-mcp.md");
  if (!dryRun) removeFile(commandFile);
  return [writeText({ file: cursorGlobal, content: removeJsonServer(readText(cursorGlobal)), dryRun }), commandFile];
};

/** @param {{ dryRun: boolean }} */
const uninstallCopilot = ({ dryRun }) => {
  const hostsFile = join(HOME, ".config", "github-copilot", "hosts.json");
  const agentFile = join(HOME, ".copilot", "agents", "rule-mcp.agent.md");
  if (!dryRun && existsSync(hostsFile)) {
    const current = readText(hostsFile);
    const json = parseJson(current);
    delete json[`copilot-mcp-${serverName}`];
    writeText({ file: hostsFile, content: toJson(json), dryRun });
  }
  if (!dryRun) removeFile(agentFile);
  return [hostsFile, agentFile];
};

/** @param {{ dryRun: boolean }} */
const uninstallGemini = ({ dryRun }) => {
  const file = join(HOME, ".gemini", "settings.json");
  const mdFile = join(HOME, ".gemini", "GEMINI.md");
  const commandFile = join(HOME, ".gemini", "commands", "rule-mcp.toml");
  if (!dryRun) removeFile(commandFile);
  return [
    writeText({ file, content: removeJsonServer(readText(file)), dryRun }),
    writeText({ file: mdFile, content: removeInstruction(readText(mdFile)), dryRun }),
    commandFile,
  ];
};

/** @param {{ dryRun: boolean }} */
const uninstallPi = ({ dryRun }) => {
  const piDir = process.env.PI_CODING_AGENT_DIR ? join(process.env.PI_CODING_AGENT_DIR) : join(HOME, ".pi", "agent");
  const file = join(piDir, "mcp.json");
  const promptFile = join(piDir, "prompts", "rule-mcp.md");
  if (!dryRun) removeFile(promptFile);
  return [writeText({ file, content: removeJsonServer(readText(file)), dryRun }), promptFile];
};

/** @param {{ dryRun: boolean }} */
const uninstallVscode = ({ dryRun }) => {
  const removeFromExistingFile = (file) => {
    if (!existsSync(file)) return null;
    const content = removeVscodeServer(readText(file));
    if (content === "") {
      if (!dryRun) removeFile(file);
      return file;
    }
    return writeText({ file, content, dryRun });
  };
  const projectFile = join(process.cwd(), ".vscode", "mcp.json");
  const globalFile = join(vscodeGlobalDir(), "mcp.json");
  return [removeFromExistingFile(projectFile), removeFromExistingFile(globalFile)].filter(Boolean);
};

/** @param {{ dryRun: boolean }} */
const uninstallJetbrains = ({ dryRun }) => {
  const file = join(process.cwd(), ".idea", "mcp.json");
  return [writeText({ file, content: removeJsonServer(readText(file)), dryRun })];
};

/** @param {{ dryRun: boolean }} */
const uninstallGeneric =
  (name) =>
  ({ dryRun }) => {
    const file = join(HOME, ".config", name, "mcp.json");
    return [writeText({ file, content: removeJsonServer(readText(file)), dryRun })];
  };

/** Map of agent names to their uninstaller functions. */
const uninstallers = {
  claude: uninstallClaude,
  codex: uninstallCodex,
  cursor: uninstallCursor,
  copilot: uninstallCopilot,
  gemini: uninstallGemini,
  pi: uninstallPi,
  vscode: uninstallVscode,
  jetbrains: uninstallJetbrains,
  cline: uninstallGeneric("cline"),
  roo: uninstallGeneric("roo"),
  zed: uninstallGeneric("zed"),
  opencode: uninstallGeneric("opencode"),
  antigravity: uninstallGeneric("antigravity"),
  windsurf: uninstallGeneric("windsurf"),
  kilo: uninstallGeneric("kilo"),
  kimi: uninstallGeneric("kimi"),
  vibe: uninstallGeneric("vibe"),
  grok: uninstallGeneric("grok"),
  droid: uninstallGeneric("droid"),
  kiro: uninstallGeneric("kiro"),
  qwen: uninstallGeneric("qwen"),
  neovim: uninstallGeneric("neovim"),
  emacs: uninstallGeneric("emacs"),
};

/**
 * Uninstall rule-mcp from one or more agents.
 *
 * @param {{ agent: string, dryRun?: boolean }} opts
 * @returns {{ ok: boolean, dryRun: boolean, uninstalled: object }}
 */
export const uninstallAgent = ({ agent, dryRun = false }) => {
  const selected = agent === "all" ? allAgents : [agent];

  if (!uninstallers[agent] && agent !== "all") {
    throw new Error(`Unsupported agent: "${agent}". Supported agents: ${allAgents.join(", ")}`);
  }

  const result = {};
  for (const name of selected) {
    if (!uninstallers[name]) {
      result[name] = { error: `No uninstaller for "${name}"` };
      continue;
    }
    try {
      result[name] = uninstallers[name]({ dryRun });
    } catch (err) {
      result[name] = { error: err.message };
    }
  }
  return { ok: true, dryRun, uninstalled: result };
};

/**
 * Detect which agents have rule-mcp configured.
 * Checks common config file locations for the MCP server entry.
 *
 * @returns {Array<{ name: string, configured: boolean, configFile: string|null }>}
 */
export function detectInstalledAgents() {
  const checks = [
    { name: "claude", path: join(HOME, ".claude.json"), key: serverName },
    { name: "codex", path: join(HOME, ".codex", "config.toml"), key: serverName },
    { name: "cursor", path: join(HOME, ".cursor", "mcp.json"), key: serverName },
    { name: "copilot", path: join(HOME, ".config", "github-copilot", "hosts.json"), key: `copilot-mcp-${serverName}` },
    { name: "gemini", path: join(HOME, ".gemini", "settings.json"), key: serverName },
    { name: "pi", path: join(HOME, ".pi", "agent", "mcp.json"), key: serverName },
    { name: "vscode", path: join(vscodeGlobalDir(), "mcp.json"), key: serverName },
    { name: "jetbrains", path: join(process.cwd(), ".idea", "mcp.json"), key: serverName },
  ];

  // Generic ~/.config/<name>/mcp.json agents
  const genericAgents = [
    "cline",
    "roo",
    "zed",
    "opencode",
    "antigravity",
    "windsurf",
    "kilo",
    "kimi",
    "vibe",
    "grok",
    "droid",
    "kiro",
    "qwen",
    "neovim",
    "emacs",
  ];
  for (const name of genericAgents) {
    const agentPath =
      name === "droid" ? join(HOME, ".config", "factory", "mcp.json") : join(HOME, ".config", name, "mcp.json");
    checks.push({ name, path: agentPath, key: serverName });
  }

  return checks.map(({ name, path, key }) => {
    if (!existsSync(path)) return { name, configured: false, configFile: null };
    try {
      const content = readFileSync(path, "utf8");
      const configured = key ? content.includes(key) : content.includes(serverName);
      return { name, configured, configFile: path };
    } catch {
      return { name, configured: false, configFile: path };
    }
  });
}

/**
 * Get all supported agent names.
 * @returns {string[]}
 */
export function getAllAgents() {
  return [...allAgents];
}
