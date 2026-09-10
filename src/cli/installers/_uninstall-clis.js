/**
 * Uninstallers: per-agent removal implementations and the uninstaller map.
 * @module cli/installers/uninstall
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { HOME, readText, removeFile, serverName, writeText } from "./_paths.js";
import { parseJson, toJson, removeJsonServer } from "./_writers-json.js";
import { removeInstruction, removeTomlBlock } from "./_writers-text.js";

/** Per-agent removal: each uninstaller touches its own agent dir only. */

const uninstallClaude = ({ dryRun }) => {
  const file = join(HOME, ".claude.json");
  const mdFile = join(HOME, ".claude", "CLAUDE.md");
  const commandFile = join(HOME, ".claude", "commands", "rule.md");

  if (!dryRun) {
    removeFile(commandFile);
  }

  return [writeText({ file, content: removeJsonServer(readText(file)), dryRun }), writeText({ file: mdFile, content: removeInstruction(readText(mdFile)), dryRun }), commandFile];
};

const uninstallCodex = ({ dryRun }) => {
  const file = join(HOME, ".codex", "config.toml");
  const mdFile = join(HOME, ".codex", "AGENTS.md");

  return [
    writeText({ file, content: removeTomlBlock(readText(file), `mcp_servers.${serverName}`), dryRun }),
    writeText({ file: mdFile, content: removeInstruction(readText(mdFile)), dryRun }),
  ];
};

/** Remove Cursor entries only. */

const uninstallCursor = ({ dryRun }) => {
  const cursorGlobal = join(HOME, ".cursor", "mcp.json");
  const commandFile = join(process.cwd(), ".cursor", "commands", "rule.md");

  if (!dryRun) {
    removeFile(commandFile);
  }

  return [writeText({ file: cursorGlobal, content: removeJsonServer(readText(cursorGlobal)), dryRun }), commandFile];
};

/** Remove Copilot entries only. */

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

/** Remove Gemini entries only. */

const uninstallGemini = ({ dryRun }) => {
  const file = join(HOME, ".gemini", "settings.json");
  const mdFile = join(HOME, ".gemini", "GEMINI.md");
  const commandFile = join(HOME, ".gemini", "commands", "rule.toml");

  if (!dryRun) {
    removeFile(commandFile);
  }

  return [writeText({ file, content: removeJsonServer(readText(file)), dryRun }), writeText({ file: mdFile, content: removeInstruction(readText(mdFile)), dryRun }), commandFile];
};

/** Remove Pi entries only. */

const uninstallPi = ({ dryRun }) => {
  const piDir = process.env.PI_CODING_AGENT_DIR ? join(process.env.PI_CODING_AGENT_DIR) : join(HOME, ".pi", "agent");
  const file = join(piDir, "mcp.json");
  const promptFile = join(piDir, "prompts", "rule.md");

  if (!dryRun) {
    removeFile(promptFile);
  }

  return [writeText({ file, content: removeJsonServer(readText(file)), dryRun }), promptFile];
};

export { uninstallClaude, uninstallCodex, uninstallCursor, uninstallCopilot, uninstallGemini, uninstallPi };
