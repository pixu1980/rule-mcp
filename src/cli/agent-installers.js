// Auto-extracted from src/cli/install.js - agent installer domain.
// Kept self-contained; install.js re-exports these for historical imports.

import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { getOrCreateSseBearerToken } from "../transport/sse-auth.js";
import { DEFAULT_SSE_PORT } from "./paths.js";

/** Resolve a path relative to the project root (3 levels up from src/cli/). */
const resolvePath = (relative) => resolve(fileURLToPath(new URL("../../", import.meta.url)), relative);

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
  if (content === null) {
    throw new Error(`Cannot write null content to ${file} - parse error in source`);
  }

  if (dryRun) {
    return file;
  }

  if (existsSync(file)) {
    backupFile(file);
  }

  const temporary = file + ".tmp." + Date.now();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(temporary, content, "utf8");
  try {
    rmSync(file, { force: true });
  } catch {
    /* ignore: file may not exist yet */
  }

  writeFileSync(file, content, "utf8");
  try {
    rmSync(temporary, { force: true });
  } catch {
    /* ignore: temp file may not exist yet */
  }

  return file;
};

/** Write a file, optionally as a dry-run (no actual write). @deprecated Use atomicWrite for safety. */
const writeText = ({ file, content, dryRun }) => {
  if (content === null) {
    throw new Error(`Cannot write null content to ${file} - parse error in source`);
  }

  if (!dryRun) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  }

  return file;
};

/** Remove a file if it exists. */
const removeFile = (file) => {
  if (existsSync(file)) {
    rmSync(file, { force: true });
  }
};

/** Create a backup copy of a file before modifying it. Returns backup path. */
const backupFile = (file) => {
  if (!existsSync(file)) {
    return null;
  }

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
 * @param {string} entrypoint - Path to the server entry script
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
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  // Fall back to PATH scan, but exclude local node_modules/.bin (project-local shims).
  try {
    const out = execSync("command -v rule-mcp 2>/dev/null || which rule-mcp 2>/dev/null", {
      encoding: "utf8",
      timeout: 2000,
    }).trim();
    if (out && existsSync(out) && !out.includes("node_modules/.bin")) {
      return out;
    }
  } catch {
    // Not found - fall back to local Node entrypoint.
  }

  return null;
};

/**
 * Environment variable config directory and file.
 */
const ENV_CONFIG_DIR = join(homedir(), ".config", "rule-mcp");
const ENV_CONFIG_FILE = join(ENV_CONFIG_DIR, "env.json");

/**
 * Opt-out feature flags, defaulted to "0" (feature ON) in generated config so
 * they are discoverable and easy to flip. Each is honored only when set to "1";
 * "0" is a no-op, so shipping them at "0" changes no behavior - it just documents
 * the switches in the user's mcp.json / Docker config.
 */
export const DEFAULT_OPTOUT_ENV = {
  RULE_MCP_NO_AUTOUPDATE: "0",
  RULE_MCP_NO_AUTORESTART: "0",
  RULE_MCP_NO_CACHE: "0",
  RULE_MCP_NO_CAVEMAN: "0",
  RULE_MCP_NO_TOKENSAVE: "0",
  RULE_MCP_NO_REMINDER: "0",
};

/**
 * Read saved RULE_MCP_* environment variable preferences from disk.
 * Returns {} if no config file exists.
 */
export function readEnvConfig() {
  try {
    if (!existsSync(ENV_CONFIG_FILE)) {
      return {};
    }

    return JSON.parse(readFileSync(ENV_CONFIG_FILE, "utf8"));
  } catch {
    return {};
  }
}

/**
 * Save RULE_MCP_* environment variable preferences to disk.
 */
export function writeEnvConfig(environment) {
  mkdirSync(ENV_CONFIG_DIR, { recursive: true });
  writeFileSync(ENV_CONFIG_FILE, JSON.stringify(environment, null, 2) + "\n", "utf8");
}

/**
 * Resolve effective environment variables for a command:
 *   opts.env > saved config > {}
 */
function resolveEnvironment(options = {}) {
  const saved = readEnvConfig();
  // Opt-out defaults are the base so they always appear in generated config;
  // saved preferences and explicit opts override them.
  return { ...DEFAULT_OPTOUT_ENV, ...saved, ...options.env };
}

const commandConfig = (entrypoint, options = {}) => {
  const mode = normalizeInstallMode(options.mode);
  const environment = resolveEnvironment(options);
  // Only pi.dev coding agent supports directTools + lifecycle
  const isPi = options.agentName === "pi";

  if (mode === "daemon" || mode === "docker") {
    const port =
      Number.isInteger(options.port) && options.port > 0 && options.port < 65_536 ? options.port : DEFAULT_SSE_PORT;
    const token = getOrCreateSseBearerToken();
    const config = {
      url: `http://127.0.0.1:${port}/sse`,
      headers: { Authorization: `Bearer ${token}` },
    };
    if (isPi) {
      config.directTools = true;
      config.lifecycle = "keep-alive";
      // Bare per-server tool naming: tools become `rule-tool-*` and prompts
      // `/rule-*` instead of the `mcp__pix_galaxy_mcp__*` prefix form.
      config.toolPrefix = "none";
    }

    return config;
  }

  // Build stdio config
  let config;
  const globalBin = resolveGlobalBinary();

  if (globalBin) {
    const home = homedir();
    config = { command: globalBin, args: ["serve"], type: "stdio" };
  } else {
    config = { command: process.execPath, args: [entrypoint, "serve"] };
  }

  if (isPi) {
    config.directTools = true;
    config.lifecycle = "keep-alive";
    // Same clean naming as the daemon branch: bare `rule-tool-*` tools and
    // `/rule-*` prompts instead of `mcp__pix_galaxy_mcp__*`.
    config.toolPrefix = "none";
  }

  // Attach env vars if any (supported by MCP stdio transport)
  if (Object.keys(environment).length > 0) {
    config.env = environment;
  }

  return config;
};

/**
 * Return the MCP server config object with the server name key.
 *
 * @param {string} entrypoint - Path to the server entry script
 * @param {{ global?: boolean, mode?: "stdio"|"daemon"|"sse"|"docker", port?: number }} [opts]
 * @returns {Record<string, object>}
 */
export function mcpServerConfig(entrypoint, opts = {}) {
  return { [serverName]: commandConfig(entrypoint, opts) };
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
const toJson = (object) => `${JSON.stringify(object, null, 2)}\n`;

/**
 * Upsert an MCP server entry in a JSON config file.
 * Returns null if the file contains invalid JSON.
 */
const upsertJsonServer = (current, config) => {
  const json = current.trim() ? parseJson(current) : {};

  if (json === null) {
    return null;
  }

  json.mcpServers = json.mcpServers ?? {};
  json.mcpServers[serverName] = { ...json.mcpServers[serverName], ...config };

  return toJson(json);
};

/**
 * Remove an MCP server entry from a JSON config file.
 * Returns null if the file contains invalid JSON.
 */
const removeJsonServer = (current) => {
  if (!current.trim()) {
    return current;
  }

  const json = parseJson(current);

  if (json === null) {
    return null;
  }

  if (json.mcpServers?.[serverName]) {
    delete json.mcpServers[serverName];

    if (Object.keys(json.mcpServers).length === 0) {
      delete json.mcpServers;
    }
  }

  return Object.keys(json).length > 0 ? toJson(json) : "";
};

/**
 * VS Code `servers` entries carry an explicit transport `type`. It MUST match
 * the endpoint the server actually speaks: the legacy HTTP+SSE transport lives
 * at /sse (type "sse"); Streamable HTTP lives at /mcp (type "http"). A stdio
 * config (no url) is "stdio". Mislabeling /sse as "http" makes VS Code POST
 * Streamable-HTTP frames the SSE transport rejects.
 *
 * @param {{ url?: string }} config
 * @returns {"stdio"|"sse"|"http"}
 */
const vscodeServerType = (config) => {
  if (!config.url) {
    return "stdio";
  }

  return config.url.endsWith("/mcp") ? "http" : "sse";
};

/**
 * Upsert an MCP server entry in VS Code-style JSON config
 * (which uses `servers` instead of `mcpServers`).
 * Returns null if the file contains invalid JSON.
 */
const upsertVscode = (current, config) => {
  const json = current.trim() ? parseJson(current) : {};

  if (json === null) {
    return null;
  }

  json.servers = json.servers ?? {};
  // VS Code owns `servers`; remove only this server from the `mcpServers` key.
  if (json.mcpServers?.[serverName]) {
    delete json.mcpServers[serverName];

    if (Object.keys(json.mcpServers).length === 0) {
      delete json.mcpServers;
    }
  }

  if (json.servers[serverName]) {
    delete json.servers[serverName];
  }

  json.servers[serverName] = { ...json.servers[serverName], ...config, type: vscodeServerType(config) };

  return toJson(json);
};

/**
 * Remove an MCP server entry from VS Code-style JSON config.
 * Returns null if the file contains invalid JSON.
 */
const removeVscodeServer = (current) => {
  if (!current.trim()) {
    return current;
  }

  const json = parseJson(current);

  if (json === null) {
    return null;
  }

  if (json.servers?.[serverName]) {
    delete json.servers[serverName];

    if (Object.keys(json.servers).length === 0) {
      delete json.servers;
    }
  }

  if (json.mcpServers?.[serverName]) {
    delete json.mcpServers[serverName];

    if (Object.keys(json.mcpServers).length === 0) {
      delete json.mcpServers;
    }
  }

  return Object.keys(json).length > 0 ? toJson(json) : "";
};

// ─── TOML helpers ───────────────────────────────────────────────────────────

/** Upsert a TOML block. */
const upsertTomlBlock = (current, blockName, block) => {
  const escapedName = blockName.replaceAll(".", String.raw`\.`);
  const re = new RegExp(String.raw`\n?\[${escapedName}\][\s\S]*?(?=\n\[[^\]]+\]|$)`, "m");
  const nb = `[${blockName}]\n${block.trim()}\n`;

  return re.test(current) ? current.replace(re, `\n${nb}`) : `${current.trimEnd()}\n\n${nb}`;
};

/** Remove a TOML block by name. */
const removeTomlBlock = (current, blockName) => {
  const re = new RegExp(String.raw`\n?\[${blockName.replaceAll(".", String.raw`\.`)}\][\s\S]*?(?=\n\[[^\]]+\]|$)`, "m");

  return re.test(current) ? current.replace(re, "") : current;
};

// ─── Instruction helpers ────────────────────────────────────────────────────

/**
 * Append rule-mcp instruction marker to agent instructions file.
 * Uses HTML comments so it's compatible with Markdown and HTML-based formats.
 *
 * @param {string} current - Current file content
 * @returns {string} - Updated content with instruction marker
 */
const appendInstruction = (current) => {
  const marker = "<!-- rule-mcp -->";

  if (current.includes(marker)) {
    return current;
  }

  return `${current.trimEnd()}\n\n${marker}\nBefore writing any frontend/styling code, call \`rule\` to route the task to the correct rule skill. Follow rule AI principles: zero CSS classes, zero inline styles, semantic HTML, external CSS via adoptedStyleSheets. Available tools: rule, pix_component, pix_check, pix_search, pix_scaffold, pix_process_adr.\n<!-- /rule-mcp -->\n`;
};

/** Remove the rule-mcp instruction marker. */
const removeInstruction = (current) => {
  const marker = "<!-- rule-mcp -->";

  if (!current.includes(marker)) {
    return current;
  }

  return current.replaceAll(/\n*<!-- rule-mcp -->[\s\S]*?<!-- \/rule-mcp -->\n*/g, "").trimEnd();
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
    writeText({
      file,
      content: upsertJsonServer(readText(file), commandConfig(entrypoint, { global, agentName: "claude" })),
      dryRun,
    }),
    writeText({ file: mdFile, content: appendInstruction(readText(mdFile)), dryRun }),
    writeText({ file: commandFile, content: commandTemplate(), dryRun }),
  ];
};

/** @param {{ entrypoint: string, dryRun: boolean, global?: boolean }} */
const installCodex = ({ entrypoint, dryRun, global }) => {
  const file = join(HOME, ".codex", "config.toml");
  const config = commandConfig(entrypoint, { global });
  const block = `command = "${config.command.replaceAll("\\", "\\\\")}"\nargs = [${config.args.map((a) => `"${a.replaceAll("\\", "\\\\")}"`).join(", ")}]`;
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
      content: upsertJsonServer(readText(cursorGlobal), commandConfig(entrypoint, { global })),
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
  json[`copilot-mcp-${serverName}`] = commandConfig(entrypoint, { global });

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
    writeText({
      file,
      content: upsertJsonServer(readText(file), commandConfig(entrypoint, { global, agentName: "gemini" })),
      dryRun,
    }),
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
    writeText({
      file,
      content: upsertJsonServer(readText(file), commandConfig(entrypoint, { global, mode, agentName: "pi" })),
      dryRun,
    }),
    writeText({ file: promptFile, content: commandTemplate(), dryRun }),
  ];
};

/** Return the VS Code user-level global config directory. */
/**
 * Return VS Code extension directories for all known variants.
 */
const vscodeExtensionDirectories = () => {
  const directories = [];

  if (IS_MACOS) {
    directories.push(
      join(HOME, ".vscode", "extensions"),
      join(HOME, ".vscode-oss", "extensions"),
      join(HOME, "Library", "Application Support", "Code - Insiders", "extensions"),
      join(HOME, ".cursor", "extensions"),
      join(HOME, ".windsurf", "extensions"),
    );
  } else if (IS_LINUX) {
    directories.push(
      join(HOME, ".vscode", "extensions"),
      join(HOME, ".vscode-oss", "extensions"),
      join(HOME, ".config", "Code - Insiders", "extensions"),
      join(HOME, ".cursor", "extensions"),
    );
  } else if (IS_WINDOWS) {
    const appData = process.env.APPDATA || join(HOME, "AppData", "Roaming");
    directories.push(
      join(HOME, ".vscode", "extensions"),
      join(HOME, "AppData", "Local", "Programs", "Microsoft VS Code", "resources", "app", "extensions"),
      join(appData, "Code - Insiders", "extensions"),
      join(HOME, ".cursor", "extensions"),
    );
  }

  return [...new Set(directories.filter(Boolean))];
};

/**
 * Remove the rule-vanilla-reactive extension directory from all known VS Code variants.
 */
const removeVscodeExtensionDirectories = ({ dryRun }) => {
  const extensionId = "rule.rule-vanilla-reactive";
  const removed = [];

  for (const dir of vscodeExtensionDirectories()) {
    if (!existsSync(dir)) {
      continue;
    }

    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!(entry.isDirectory() && entry.name.startsWith(extensionId))) {
        continue;
      }

      const fullPath = join(dir, entry.name);

      if (!dryRun) {
        rmSync(fullPath, { recursive: true, force: true });
      }

      removed.push(fullPath);
    }
  }

  return removed;
};

/** Return the VS Code user-level global config directory. */
const vscodeGlobalDir = () => {
  if (process.platform === "darwin") {
    return join(HOME, "Library", "Application Support", "Code", "User");
  }

  if (process.platform === "win32") {
    return join(process.env.APPDATA || join(HOME, "AppData", "Roaming"), "Code", "User");
  }

  return join(HOME, ".config", "Code", "User");
};

/**
 * Try to build and install the rule-vanilla-reactive extension for a given editor CLI.
 * Returns true if the extension was installed successfully.
 */
const tryInstallExtension = (cli, vsixPath, label) => {
  try {
    const result = execSync(`${cli} --install-extension "${vsixPath}" --force`, {
      encoding: "utf8",
      timeout: 30_000,
      stdio: "pipe",
    });
    if (result.includes("already installed") || result.includes("Successfully installed")) {
      return true;
    }

    return true;
  } catch {
    return false;
  }
};

/**
 * Install the rule-vanilla-reactive VSIX extension for VS Code and all derivatives.
 * Tries: code, cursor, windsurf, code-insiders, code-oss, codium
 */
const installVscodeExtension = ({ dryRun, vsixPath }) => {
  if (dryRun) {
    return [];
  }

  if (!existsSync(vsixPath)) {
    console.warn(`  \u{26A0} Extension VSIX not found at: ${vsixPath}`);

    return [];
  }

  const editors = [
    { cli: "code", label: "VS Code" },
    { cli: "cursor", label: "Cursor" },
    { cli: "windsurf", label: "Windsurf" },
    { cli: "code-insiders", label: "VS Code Insiders" },
    { cli: "code-oss", label: "Code-OSS" },
    { cli: "codium", label: "Codium" },
  ];

  const installed = [];

  for (const { cli, label } of editors) {
    try {
      const found = execSync(`command -v ${cli} 2>/dev/null || which ${cli} 2>/dev/null`, {
        encoding: "utf8",
        timeout: 2000,
      }).trim();
      if (!found) {
        continue;
      }

      const ok = tryInstallExtension(cli, vsixPath, label);

      if (ok) {
        installed.push(label);
      }
    } catch {
      // CLI not found, skip
    }
  }

  return installed;
};

/**
 * Uninstall the rule-vanilla-reactive extension for VS Code and all derivatives.
 * Uses each editor's CLI --uninstall-extension.
 */
const uninstallVscodeExtension = ({ dryRun }) => {
  if (dryRun) {
    return [];
  }

  const extensionId = "rule.rule-vanilla-reactive";
  const editors = [
    { cli: "code", label: "VS Code" },
    { cli: "cursor", label: "Cursor" },
    { cli: "windsurf", label: "Windsurf" },
    { cli: "code-insiders", label: "VS Code Insiders" },
    { cli: "code-oss", label: "Code-OSS" },
    { cli: "codium", label: "Codium" },
  ];

  const uninstalled = [];

  for (const { cli, label } of editors) {
    try {
      const found = execSync(`command -v ${cli} 2>/dev/null || which ${cli} 2>/dev/null`, {
        encoding: "utf8",
        timeout: 2000,
      }).trim();
      if (!found) {
        continue;
      }

      execSync(`${cli} --uninstall-extension ${extensionId}`, {
        encoding: "utf8",
        timeout: 30_000,
        stdio: "pipe",
      });
      uninstalled.push(label);
    } catch {
      // CLI not found or extension not installed, skip
    }
  }

  // Safety net: also remove extension directories from disk
  try {
    removeVscodeExtensionDirectories({ dryRun });
  } catch {
    // non-critical
  }

  return uninstalled;
};

/** @param {{ entrypoint: string, dryRun: boolean, global?: boolean, mode?: "stdio"|"daemon"|"sse"|"docker" }} */
const installVscode = ({ entrypoint, dryRun, global, mode }) => {
  // The universal installer is user-level. Workspace config is opt-in outside it.
  const globalFile = join(vscodeGlobalDir(), "mcp.json");
  const results = [
    writeText({
      file: globalFile,
      content: upsertVscode(readText(globalFile), commandConfig(entrypoint, { global, mode, agentName: "vscode" })),
      dryRun,
    }),
  ];

  // Also install the rule-vanilla-reactive VSIX extension (syntax highlighting, autocomplete)
  const vsixPath = resolvePath("extensions/rule-vanilla-reactive.vsix");

  if (!dryRun) {
    const editors = installVscodeExtension({ dryRun, vsixPath });

    if (editors.length > 0) {
      results.push(`extension installed: ${editors.join(", ")}`);
    }
  }

  return results;
};

/** @param {{ entrypoint: string, dryRun: boolean, global?: boolean }} */
const installJetbrains = ({ entrypoint, dryRun, global }) => {
  const file = join(process.cwd(), ".idea", "mcp.json");

  return [
    writeText({
      file,
      content: upsertJsonServer(readText(file), commandConfig(entrypoint, { global, agentName: "jetbrains" })),
      dryRun,
    }),
  ];
};

/** @param {{ entrypoint: string, dryRun: boolean, global?: boolean }} */
const installNeovim = ({ entrypoint, dryRun, global }) => {
  const nvimDir = IS_WINDOWS ? join(HOME, "AppData", "Local", "nvim") : join(HOME, ".config", "nvim");
  const file = join(nvimDir, "mcp.json");

  return [
    writeText({
      file,
      content: upsertJsonServer(readText(file), commandConfig(entrypoint, { global, agentName: "neovim" })),
      dryRun,
    }),
  ];
};

/** @param {{ entrypoint: string, dryRun: boolean, global?: boolean }} */
const installEmacs = ({ entrypoint, dryRun, global }) => {
  // Emacs uses init.el or early-init.el
  const emacsDir = IS_WINDOWS ? join(HOME, "AppData", "Roaming", ".emacs.d") : join(HOME, ".emacs.d");
  const initFile = join(emacsDir, "init.el");
  const config = commandConfig(entrypoint, { global, agentName: "emacs" });
  const isPi = false; // Emacs is never pi.dev
  const emacsConfig = `;; rule-mcp\n(setq mcp-servers '((\n  "${serverName}" . (\n    (command . "${config.command}")\n    (args . ${JSON.stringify(config.args)})${isPi ? '\n    (directTools . t)\n    (lifecycle . "keep-alive")' : ""}))))\n`;

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
 * @param {string} name - Agent name
 * @param {object} [opts]
 * @param {string} [opts.configPath] - Custom config path (default: ~/.config/<name>/mcp.json)
 * @param {string} [opts.instructionsPath] - Custom instructions path
 * @returns {Function} Installer function
 */
const createGenericInstaller = (name, opts = {}) => {
  const configPath = opts.configPath || join(HOME, ".config", name, "mcp.json");
  const instructionsPath = opts.instructionsPath || join(HOME, ".config", name, "instructions.md");

  return ({ entrypoint, dryRun, global }) => {
    const results = [
      writeText({
        file: configPath,
        content: upsertJsonServer(readText(configPath), commandConfig(entrypoint, { global, agentName: name })),
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
 * @param {string[]} agents - List of installed agent names
 * @param {string} entrypoint - Server entry point path
 * @param {boolean} global - Whether using global install
 * @param {"stdio"|"daemon"|"docker"} mode - MCP transport/deployment mode
 * @returns {string} - Manifest file path
 */
const uninstallClaude = ({ dryRun }) => {
  const file = join(HOME, ".claude.json");
  const mdFile = join(HOME, ".claude", "CLAUDE.md");
  const commandFile = join(HOME, ".claude", "commands", "rule-mcp.md");

  if (!dryRun) {
    removeFile(commandFile);
  }

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

  if (!dryRun) {
    removeFile(commandFile);
  }

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

  if (!dryRun) {
    removeFile(agentFile);
  }

  return [hostsFile, agentFile];
};

/** @param {{ dryRun: boolean }} */
const uninstallGemini = ({ dryRun }) => {
  const file = join(HOME, ".gemini", "settings.json");
  const mdFile = join(HOME, ".gemini", "GEMINI.md");
  const commandFile = join(HOME, ".gemini", "commands", "rule-mcp.toml");

  if (!dryRun) {
    removeFile(commandFile);
  }

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

  if (!dryRun) {
    removeFile(promptFile);
  }

  return [writeText({ file, content: removeJsonServer(readText(file)), dryRun }), promptFile];
};

/** @param {{ dryRun: boolean }} */
const uninstallVscode = ({ dryRun }) => {
  // Also uninstall the VSIX extension from all editor variants
  uninstallVscodeExtension({ dryRun });

  const removeFromExistingFile = (file) => {
    if (!existsSync(file)) {
      return null;
    }

    const content = removeVscodeServer(readText(file));

    if (content === "") {
      if (!dryRun) {
        removeFile(file);
      }

      return file;
    }

    return writeText({ file, content, dryRun });
  };

  const results = [];

  // Project-level
  const projectFile = join(process.cwd(), ".vscode", "mcp.json");
  results.push(removeFromExistingFile(projectFile));

  // Global (main VS Code)
  const globalFile = join(vscodeGlobalDir(), "mcp.json");
  results.push(removeFromExistingFile(globalFile));

  // VS Code Insiders global
  const insidersDir = IS_MACOS
    ? join(HOME, "Library", "Application Support", "Code - Insiders", "User")
    : IS_WINDOWS
      ? join(process.env.APPDATA || join(HOME, "AppData", "Roaming"), "Code - Insiders", "User")
      : join(HOME, ".config", "Code - Insiders", "User");
  results.push(removeFromExistingFile(join(insidersDir, "mcp.json")));

  // Code-OSS global
  if (!IS_WINDOWS) {
    const ossDir = IS_MACOS
      ? join(HOME, "Library", "Application Support", "Code - OSS", "User")
      : join(HOME, ".config", "Code - OSS", "User");
    results.push(removeFromExistingFile(join(ossDir, "mcp.json")));
  }

  // Cursor global
  results.push(removeFromExistingFile(join(HOME, ".cursor", "mcp.json")));

  return results.filter(Boolean);
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

export {
  serverName,
  allAgents,
  remoteModeAgents,
  normalizeInstallMode,
  IS_WINDOWS,
  IS_MACOS,
  IS_LINUX,
  HOME,
  COMMAND_TEMPLATE_PATH,
  ENV_CONFIG_DIR,
  ENV_CONFIG_FILE,
  resolvePath,
  readText,
  atomicWrite,
  writeText,
  removeFile,
  backupFile,
  resolveGlobalBinary,
  resolveEnvironment,
  commandConfig,
  parseJson,
  toJson,
  upsertJsonServer,
  removeJsonServer,
  vscodeServerType,
  upsertVscode,
  removeVscodeServer,
  upsertTomlBlock,
  removeTomlBlock,
  appendInstruction,
  removeInstruction,
  commandTemplate,
  commandBody,
  geminiCommand,
  copilotAgent,
  installers,
  uninstallers,
  vscodeGlobalDir,
};
