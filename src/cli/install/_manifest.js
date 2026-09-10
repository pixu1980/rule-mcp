

/** @module cli/install/manifest - the record of what was installed, for uninstall */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { platform } from "node:os";
import { HOME } from "../installers/index.js";

export * from "../installers/index.js";

/** Record what was installed, so uninstall can undo exactly that. */
export function writeInstalledManifest(agents, entrypoint, global, mode) {
  const stateDir = join(HOME, ".local", "share", "rule-mcp");
  mkdirSync(stateDir, { recursive: true });
  const manifestPath = join(stateDir, "installed.md");
  const timestamp = new Date().toISOString();
  const lines = [
    "# rule-mcp - Installation Manifest",
    "",
    `Generated: ${timestamp}`,
    `Install source: ${global ? "global" : "local"}`,
    `Transport: ${mode}`,
    `Entry point: ${entrypoint}`,
    `Node version: ${process.version}`,
    `Platform: ${platform()}`,
    "",
    "## Installed Agents",
    "",
  ];

  for (const name of agents) {
    lines.push(`- [x] ${name}`);
  }

  lines.push("", "---", "", `To reinstall: \`rule-mcp install --agent all --mode ${mode}\``);
  writeFileSync(manifestPath, lines.join("\n") + "\n");

  return manifestPath;
}
