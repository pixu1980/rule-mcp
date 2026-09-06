/**
 * @module cli/installers
 *
 * Agent installer registry facade.
 *
 * The per-agent install/uninstall implementations live in `./installers/`
 * split by concern (catalog, path helpers, env config, JSON/text writers,
 * CLI-agent installs, IDE installs, uninstallers, registry). This module
 * keeps the stable public surface: `install.js` and callers import the same
 * names they always did, so the split is invisible outside.
 */

export { allAgents, remoteModeAgents, normalizeInstallMode } from "./_catalog.js";

export {
  serverName,
  IS_WINDOWS,
  IS_MACOS,
  IS_LINUX,
  HOME,
  COMMAND_TEMPLATE_PATH,
  resolvePath,
  readText,
  atomicWrite,
  writeText,
  removeFile,
  backupFile,
  resolveGlobalBinary,
} from "./_paths.js";

export {
  ENV_CONFIG_DIR,
  ENV_CONFIG_FILE,
  DEFAULT_OPTOUT_ENV,
  readEnvConfig,
  writeEnvConfig,
  resolveEnvironment,
  commandConfig,
  mcpServerConfig,
} from "./_env.js";

export {
  parseJson,
  toJson,
  upsertJsonServer,
  removeJsonServer,
  vscodeServerType,
  upsertVscode,
  removeVscodeServer,
} from "./_writers-json.js";

export {
  upsertTomlBlock,
  removeTomlBlock,
  appendInstruction,
  removeInstruction,
  commandTemplate,
  commandBody,
  geminiCommand,
  copilotAgent,
} from "./_writers-text.js";

export { vscodeGlobalDir, devinConfigPath } from "./_agents-ide.js";

export { deprecatedAgents, installers } from "./_registry.js";

export { uninstallers } from "./_uninstall.js";
