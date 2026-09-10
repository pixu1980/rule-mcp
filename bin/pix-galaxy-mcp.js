#!/usr/bin/env node
// SPDX-FileCopyrightText: 2025-2026 pixu1980
// SPDX-License-Identifier: MIT

/**
 * @module bin/pix-galaxy-mcp
 *
 * CLI entry point for pix-galaxy-mcp.
 * Delegates to the cli() function in src/index.js.
 *
 * Usage: pix-galaxy-mcp [command] [options]
 *   See `pix-galaxy-mcp help` for full usage.
 *
 * The compiled code cache is turned on before the application graph is loaded,
 * and the load is a dynamic import for that reason: a static import is hoisted
 * above every statement here, so the modules would be compiled before the
 * cache existed. stdio spawns this process per client, so every module it
 * parses is parsed again on the next connect.
 *
 * `NODE_COMPILE_CACHE=<dir>` picks the directory; `NODE_DISABLE_COMPILE_CACHE=1`
 * turns it off, which is what CI and the test suites use so a run never depends
 * on a cache another run wrote.
 *
 * @see https://nodejs.org/api/module.html#moduleenablecompilecachecachedir
 */

try {
  const { enableCompileCache } = await import("node:module");

  // Added in Node 22.1; the engines field allows 20, where this is a no-op.
  enableCompileCache?.();
} catch {
  /* a cache is an optimization, never a reason to fail to start */
}

const { cli } = await import("../src/index.js");

cli();
