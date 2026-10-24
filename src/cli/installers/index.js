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

export * from "./_catalog.js";

export * from "./_paths.js";

export * from "./_env.js";

export * from "./_writers-json.js";

export * from "./_writers-opencode.js";

export * from "./_writers-text.js";

export * from "./_agents-ide.js";

export * from "./_registry.js";

export * from "./_uninstall.js";
