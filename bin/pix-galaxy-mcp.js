#!/usr/bin/env node

/**
 * @module bin/pix-galaxy-mcp
 *
 * CLI entry point for pix-galaxy-mcp.
 * Delegates to the cli() function in src/index.js.
 *
 * Usage: pix-galaxy-mcp [command] [options]
 *   See `pix-galaxy-mcp help` for full usage.
 */

import { cli } from "../src/index.js";

cli();
