/**
 * Installers for IDE/desktop agents: VS Code, JetBrains, Neovim, Emacs, Devin,
 * the generic fallback installer, and platform path helpers.
 * @module cli/installers/agents-ide
 */

import { join } from "node:path";
import { HOME, IS_WINDOWS, readText, writeText, serverName } from "./_paths.js";
import { commandConfig } from "./_env.js";
import { upsertJsonServer, upsertVscode } from "./_writers-json.js";
import { appendInstruction } from "./_writers-text.js";
import { renderAgentCommandFiles } from "../../core/agents/_commands.js";

const vscodeGlobalDir = () => {
  if (process.platform === "darwin") {
    return join(HOME, "Library", "Application Support", "Code", "User");
  }

  if (process.platform === "win32") {
    return join(process.env.APPDATA || join(HOME, "AppData", "Roaming"), "Code", "User");
  }

  return join(HOME, ".config", "Code", "User");
};

const devinConfigPath = () => {
  if (process.platform === "win32") {
    return join(process.env.APPDATA || join(HOME, "AppData", "Roaming"), "devin", "mcp_config.json");
  }

  return join(HOME, ".config", "devin", "mcp_config.json");
};

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

  return results;
};

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

const installDevin = ({ entrypoint, dryRun, global }) => {
  const results = [
    writeText({
      file: devinConfigPath(),
      content: upsertJsonServer(readText(devinConfigPath()), commandConfig(entrypoint, { global, agentName: "devin" })),
      dryRun,
    }),
  ];
  // Devin invokes commands as /<name> from ~/.config/devin/skills: the clean
  // slash-command set, one directory per command, each holding a SKILL.md.
  const base = join(HOME, ".config", "devin", "skills");

  for (const { filename, content } of renderAgentCommandFiles("devin")) {
    results.push(writeText({ file: join(base, filename), content, dryRun }));
  }

  return results;
};

export {
  vscodeGlobalDir,
  devinConfigPath,
  installVscode,
  installJetbrains,
  installNeovim,
  installEmacs,
  createGenericInstaller,
  installDevin,
};
