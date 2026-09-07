#!/usr/bin/env node

/**
 * @module index
 *
 * CLI entry point for pix-galaxy-mcp.
 *
 * The actual command tree is built and dispatched by {@link module:cli/program}
 * (commander-based). This module stays thin so the bin shim and any embedding
 * code only need the stable `cli()` export.
 *
 * Usage:
 *   pix-galaxy-mcp serve
 *   pix-galaxy-mcp daemon start|stop|status|logs
 *   pix-galaxy-mcp install --agent <name> [--dry-run] [--force]
 *   pix-galaxy-mcp uninstall --agent <name> [--dry-run]
 *   pix-galaxy-mcp tools list|call <name> --json '{...}'
 *   pix-galaxy-mcp doctor
 *   pix-galaxy-mcp config [env]
 *   pix-galaxy-mcp skills reload
 */

import { installProcessErrorHandlers } from "./utils/index.js";
import { runCli } from "./cli/index.js";

// Install global error handlers at process level
// Prevents uncaught exceptions from crashing the server
installProcessErrorHandlers();

/**
 * Main CLI entry: parse and dispatch.
 * @param {string[]} [argv] override process.argv (used by tests/embedding)
 */
export async function cli(argv) {
  await runCli(argv ?? process.argv.slice(2));
}
