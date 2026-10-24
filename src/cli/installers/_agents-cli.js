

/**
 * Installers for CLI-focused agents: Claude, Codex, Cursor, Copilot, Gemini, Pi.
 * @module cli/installers/agents-cli
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { HOME, atomicWrite, readText, writeText, serverName } from "./_paths.js";
import { commandConfig } from "./_env.js";
import { parseJson, toJson, upsertJsonServer } from "./_writers-json.js";
import { commandTemplate, geminiCommand, copilotAgent, appendInstruction, upsertTomlBlock } from "./_writers-text.js";

/** Install into Claude Code only (~/.claude/commands/rule-mcp.md, never other agents). */
const installClaude = ({ entrypoint, dryRun = false, global = false, force = false }) => {
  const file = join(HOME, ".claude.json");
  const mdFile = join(HOME, ".claude", "CLAUDE.md");
  const commandFile = join(HOME, ".claude", "commands", "rule-mcp.md");

  return [
    // The config is an upsert where a merge can go wrong, so the pre-write
    // content is backed up before it is replaced (the backup promise).
    atomicWrite({
      file,
      content: upsertJsonServer(readText(file), commandConfig(entrypoint, { global, agentName: "claude" })),
      dryRun,
    }),
    writeText({ file: mdFile, content: appendInstruction(readText(mdFile), { refresh: force }), dryRun }),
    writeText({ file: commandFile, content: commandTemplate(), dryRun, skipIfExists: !force, force }),
    // Note: We DO NOT install into Pi or other agents here.
    // User choices are respected - only the selected agent gets the slash commands.
    // The RULE_MCP_NO_PROMPTS flag (when set by the user/system) will
    // prevent duplicate MCP prompt entries in Claude Code.
  ];
};

/**
 * Installs rule-mcp into Codex.
 * @param {{ entrypoint: string, dryRun?: boolean, global?: boolean }} opts
 * @returns {Array<{ file: string, action: string }>}
 */
const installCodex = ({ entrypoint, dryRun = false, global = false }) => {
  const file = join(HOME, ".codex", "config.toml");
  const config = commandConfig(entrypoint, { global });
  const block = `command = "${config.command.replaceAll("\\", "\\\\")}"\nargs = [${config.args.map((a) => `"${a.replaceAll("\\", "\\\\")}"`).join(", ")}]`;
  const mdFile = join(HOME, ".codex", "AGENTS.md");

  return [
    writeText({ file, content: upsertTomlBlock(readText(file), `mcp_servers.${serverName}`, block), dryRun }),
    writeText({ file: mdFile, content: appendInstruction(readText(mdFile)), dryRun }),
  ];
};

/**
 * Installs rule-mcp into Cursor.
 * @param {{ entrypoint: string, dryRun?: boolean, global?: boolean }} opts
 * @returns {Array<{ file: string, action: string }>}
 */
const installCursor = ({ entrypoint, dryRun = false, global = false }) => {
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

  if (!existsSync(cursorRules) || !readText(cursorRules).includes("rule-mcp")) {
    writeText({
      file: cursorRules,
      content: appendInstruction(readText(cursorRules)),
      dryRun,
    });
  }

  return files;
};

/**
 * Installs rule-mcp into Copilot.
 * @param {{ entrypoint: string, dryRun?: boolean, global?: boolean }} opts
 * @returns {Array<{ file: string, action: string }>}
 */
const installCopilot = ({ entrypoint, dryRun = false, global = false }) => {
  const hostsDir = join(HOME, ".config", "github-copilot");
  const hostsFile = join(hostsDir, "hosts.json");
  const agentFile = join(HOME, ".copilot", "agents", "rule-mcp.agent.md");
  const current = readText(hostsFile);
  const json = current.trim() ? parseJson(current) : {};
  json[`copilot-mcp-${serverName}`] = commandConfig(entrypoint, { global });

  return [writeText({ file: hostsFile, content: toJson(json), dryRun }), writeText({ file: agentFile, content: copilotAgent(), dryRun })];
};

/**
 * Installs rule-mcp into Gemini CLI.
 * @param {{ entrypoint: string, dryRun?: boolean, global?: boolean }} opts
 * @returns {Array<{ file: string, action: string }>}
 */
const installGemini = ({ entrypoint, dryRun = false, global = false }) => {
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

/**
 * Installs rule-mcp into Pi coding agent.
 * @param {{ entrypoint: string, dryRun?: boolean, global?: boolean, mode?: string }} opts
 * @returns {Array<{ file: string, action: string }>}
 */
const installPi = ({ entrypoint, dryRun = false, global = false, mode = "stdio" }) => {
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

export { installClaude, installCodex, installCursor, installCopilot, installGemini, installPi };
