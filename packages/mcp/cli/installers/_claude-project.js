/** The Claude files a project install writes beside the MCP entry. */

import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

import { renderAgentCommandFiles } from "../../core/agents/commands/index.js";
import { withHooks, withoutHooks } from "../../core/agents/_hooks.js";
import { hookLauncher } from "./_env-command.js";
import { parseJson, toJson } from "./_writers-json.js";
import { appendInstruction, removeInstruction } from "./_writers-text.js";
import { readText, writeText } from "./_paths.js";

/** The files Claude reads from the project itself, and which of them this install writes. */
const CLAUDE_PROJECT_FILES = {
  instruction: "CLAUDE.md",
  commands: join(".claude", "commands"),
  sharedSettings: join(".claude", "settings.json"),
  localSettings: join(".claude", "settings.local.json"),
};

/**
 * Write the Claude project extras: the rules block, the slash commands, and the
 * hooks, all inside the project tree.
 *
 * The three files are the ones a global Claude install writes; only the root
 * differs. A `local` project config puts the hooks in `settings.local.json`, so a
 * teammate's clone does not inherit them.
 *
 * @param {{ projectRoot: string, projectConfig: "shared"|"local", entrypoint?: string, dryRun?: boolean }} options
 * @returns {string[]} the paths written
 */
export function installClaudeProjectExtras({ projectRoot, projectConfig = "shared", entrypoint = process.argv[1] ?? "rule-mcp", dryRun = false } = {}) {
  const written = [];
  const instructionFile = join(projectRoot, CLAUDE_PROJECT_FILES.instruction);

  writeText({ file: instructionFile, content: appendInstruction(readText(instructionFile)), dryRun });
  written.push(instructionFile);

  const commandsDir = join(projectRoot, CLAUDE_PROJECT_FILES.commands);

  for (const file of renderAgentCommandFiles("args")) {
    const path = join(commandsDir, file.filename);

    writeText({ file: path, content: file.content, dryRun });
    written.push(path);
  }

  const settingsFile = join(projectRoot, projectConfig === "local" ? CLAUDE_PROJECT_FILES.localSettings : CLAUDE_PROJECT_FILES.sharedSettings);
  // The hook launcher, not the server's: the server's args end in `serve`.
  const current = parseJson(readText(settingsFile)) ?? {};

  writeText({ file: settingsFile, content: toJson(withHooks(current, hookLauncher(entrypoint))), dryRun });
  written.push(settingsFile);

  return written;
}

/**
 * Remove what installClaudeProjectExtras wrote.
 *
 * @param {{ projectRoot: string, projectConfig: "shared"|"local", dryRun?: boolean }} options
 * @returns {string[]} the paths touched
 */
export function uninstallClaudeProjectExtras({ projectRoot, projectConfig = "shared", dryRun = false } = {}) {
  const written = [];
  const instructionFile = join(projectRoot, CLAUDE_PROJECT_FILES.instruction);

  if (existsSync(instructionFile)) {
    writeText({ file: instructionFile, content: removeInstruction(readText(instructionFile)), dryRun });
    written.push(instructionFile);
  }

  const commandsDir = join(projectRoot, CLAUDE_PROJECT_FILES.commands);

  for (const file of renderAgentCommandFiles("args")) {
    rmSync(join(commandsDir, file.filename), { force: true });
    written.push(join(commandsDir, file.filename));
  }

  const settingsFile = join(projectRoot, projectConfig === "local" ? CLAUDE_PROJECT_FILES.localSettings : CLAUDE_PROJECT_FILES.sharedSettings);

  if (existsSync(settingsFile)) {
    const current = parseJson(readText(settingsFile)) ?? {};

    writeText({ file: settingsFile, content: toJson(withoutHooks(current)), dryRun });
    written.push(settingsFile);
  }

  return written;
}
