/**
 * @module cli/agent-installers
 *
 * Agent installer registry facade.
 *
 * The per-agent install/uninstall implementations live in `./installers/`
 * split by concern (catalog, path helpers, env config, JSON/text writers,
 * CLI-agent installs, IDE installs, uninstallers, registry). This module
 * keeps the stable public surface: `install.js` and callers import the same
 * names they always did, so the split is invisible outside.
 */

export {
  allAgents,
  remoteModeAgents,
  normalizeInstallMode,
} from "./installers/catalog.js";

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
} from "./installers/paths.js";

export {
  ENV_CONFIG_DIR,
  ENV_CONFIG_FILE,
  DEFAULT_OPTOUT_ENV,
  readEnvConfig,
  writeEnvConfig,
  resolveEnvironment,
  commandConfig,
  mcpServerConfig,
} from "./installers/env.js";

export {
  parseJson,
  toJson,
  upsertJsonServer,
  removeJsonServer,
  vscodeServerType,
  upsertVscode,
  removeVscodeServer,
} from "./installers/writers-json.js";

export {
  upsertTomlBlock,
  removeTomlBlock,
  appendInstruction,
  removeInstruction,
  commandTemplate,
  commandBody,
  geminiCommand,
  copilotAgent,
} from "./installers/writers-text.js";

export {
  vscodeGlobalDir,
  devinConfigPath,
} from "./installers/agents-ide.js";

export { deprecatedAgents, installers } from "./installers/registry.js";

export { uninstallers } from "./installers/uninstall.js";
