/** Shared service plumbing: the entrypoint, safe exec, the wrapper script. */
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
export { tryExec } from "../../shared/index.js";

/** The user home directory. */
export const HOME = homedir();

/** Absolute path of the CLI entrypoint this service runs. */
export function resolveEntrypoint() {
  const __dirname = fileURLToPath(new URL(".", import.meta.url));
  const scriptPath = join(__dirname, "..", "..", "..", "bin", "pix-galaxy-mcp.js");
  const nodePath = process.execPath;

  return {
    node: nodePath,
    script: scriptPath,
    command: [nodePath, scriptPath, "serve", "--transport", "sse"],
  };
}

/**
 * Path to the wrapper shell script that macOS shows in Login Items.
 * Using a wrapper script instead of calling Node.js directly ensures that
 * macOS displays "pix-galaxy-mcpd" in Login Items rather than "Node.js Foundation".
 */
export const WRAPPER_SCRIPT_PATH = join(HOME, ".local", "bin", "pix-galaxy-mcpd");

/**
 * Generate the wrapper shell script that the LaunchAgent runs.
 * Using a wrapper script instead of calling Node.js directly ensures that
 * macOS displays "pix-galaxy-mcpd" in Login Items rather than "Node.js Foundation".
 *
 * @param {{ node: string, script: string }} ep
 * @returns {string} - shell script content
 */
export function generateWrapperScript(ep) {
  return `#!/usr/bin/env bash
# pix-galaxy-mcp daemon wrapper
# This wrapper is called by the LaunchAgent so macOS shows
# "pix-galaxy-mcpd" in Login Items instead of "Node.js Foundation".
set -euo pipefail

if [[ $# -gt 0 ]]; then
  exec ${escapePlist(ep.node)} ${escapePlist(ep.script)} "$@"
fi

export PIX_GALAXY_MCP_DAEMON=1
exec ${escapePlist(ep.node)} ${escapePlist(ep.script)} serve --transport sse
`;
}

/** Escape a string for embedding in a plist. */
export function escapePlist(s) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
