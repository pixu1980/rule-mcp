/** @module cli/installers/uninstall - the editor uninstallers and the registry */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { HOME, IS_MACOS, IS_WINDOWS, readText, removeFile, writeText } from "./_paths.js";
import { removeJsonServer, removeVscodeServer } from "./_writers-json.js";
import { vscodeGlobalDir, devinConfigPath } from "./_agents-ide.js";
import { uninstallClaude, uninstallCodex, uninstallCursor, uninstallCopilot, uninstallGemini, uninstallPi } from "./_uninstall-clis.js";
import { uninstallOpencode } from "./_agents-opencode.js";
export * from "./_uninstall-clis.js";
export { uninstallOpencode } from "./_agents-opencode.js";

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
    const ossDir = IS_MACOS ? join(HOME, "Library", "Application Support", "Code - OSS", "User") : join(HOME, ".config", "Code - OSS", "User");
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
  opencode: uninstallOpencode,
  vscode: uninstallVscode,
  jetbrains: uninstallJetbrains,
  cline: uninstallGeneric("cline"),
  roo: uninstallGeneric("roo"),
  zed: uninstallGeneric("zed"),
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

export { uninstallVscode, uninstallDevin, uninstallJetbrains, uninstallGeneric, uninstallers };
