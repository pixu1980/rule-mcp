/**
 * Uninstallers: per-agent removal implementations and the uninstaller map.
 * @module cli/installers/uninstall
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { HOME, IS_MACOS, IS_WINDOWS, readText, removeFile, serverName, writeText } from "./paths.js";
import { parseJson, toJson, removeJsonServer, removeVscodeServer } from "./writers-json.js";
import { removeInstruction, removeTomlBlock } from "./writers-text.js";
import { vscodeGlobalDir, devinConfigPath } from "./agents-ide.js";

const uninstallClaude = ({ dryRun }) => {
  const file = join(HOME, ".claude.json");
  const mdFile = join(HOME, ".claude", "CLAUDE.md");
  const commandFile = join(HOME, ".claude", "commands", "rule.md");

  if (!dryRun) {
    removeFile(commandFile);
  }

  return [
    writeText({ file, content: removeJsonServer(readText(file)), dryRun }),
    writeText({ file: mdFile, content: removeInstruction(readText(mdFile)), dryRun }),
    commandFile,
  ];
};

const uninstallCodex = ({ dryRun }) => {
  const file = join(HOME, ".codex", "config.toml");
  const mdFile = join(HOME, ".codex", "AGENTS.md");

  return [
    writeText({ file, content: removeTomlBlock(readText(file), `mcp_servers.${serverName}`), dryRun }),
    writeText({ file: mdFile, content: removeInstruction(readText(mdFile)), dryRun }),
  ];
};

const uninstallCursor = ({ dryRun }) => {
  const cursorGlobal = join(HOME, ".cursor", "mcp.json");
  const commandFile = join(process.cwd(), ".cursor", "commands", "rule.md");

  if (!dryRun) {
    removeFile(commandFile);
  }

  return [writeText({ file: cursorGlobal, content: removeJsonServer(readText(cursorGlobal)), dryRun }), commandFile];
};

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

const uninstallGemini = ({ dryRun }) => {
  const file = join(HOME, ".gemini", "settings.json");
  const mdFile = join(HOME, ".gemini", "GEMINI.md");
  const commandFile = join(HOME, ".gemini", "commands", "rule.toml");

  if (!dryRun) {
    removeFile(commandFile);
  }

  return [
    writeText({ file, content: removeJsonServer(readText(file)), dryRun }),
    writeText({ file: mdFile, content: removeInstruction(readText(mdFile)), dryRun }),
    commandFile,
  ];
};

const uninstallPi = ({ dryRun }) => {
  const piDir = process.env.PI_CODING_AGENT_DIR ? join(process.env.PI_CODING_AGENT_DIR) : join(HOME, ".pi", "agent");
  const file = join(piDir, "mcp.json");
  const promptFile = join(piDir, "prompts", "rule.md");

  if (!dryRun) {
    removeFile(promptFile);
  }

  return [writeText({ file, content: removeJsonServer(readText(file)), dryRun }), promptFile];
};

const uninstallVscode = ({ dryRun }) => {
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

const uninstallDevin = ({ dryRun }) => {
  const file = devinConfigPath();

  return [writeText({ file, content: removeJsonServer(readText(file)), dryRun })];
};

const uninstallJetbrains = ({ dryRun }) => {
  const file = join(process.cwd(), ".idea", "mcp.json");

  return [writeText({ file, content: removeJsonServer(readText(file)), dryRun })];
};

const uninstallGeneric =
  (name) =>
  ({ dryRun }) => {
    const file = join(HOME, ".config", name, "mcp.json");

    return [writeText({ file, content: removeJsonServer(readText(file)), dryRun })];
  };

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
  devin: uninstallDevin,
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

export { uninstallClaude, uninstallCodex, uninstallCursor, uninstallCopilot, uninstallGemini, uninstallPi, uninstallVscode, uninstallDevin, uninstallJetbrains, uninstallGeneric, uninstallers };
