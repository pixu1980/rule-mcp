/** @module cli/cache/command - the cache CLI dispatcher */

import { primeFromCatalog, CATALOG_FILE } from "../../core/cache/catalog/index.js";
import { cacheClear } from "../../core/cache/tool-cache/index.js";
import { exportCommand, verifyCommand } from "./_export.js";
import { print } from "./_helpers.js";
import { statsCommand } from "./_stats.js";

/**
 * Run a `cache` subcommand.
 *
 * @param {string} subcommand - stats | export | verify | clear | prime
 * @param {{ dir?: string }} [options]
 */
export async function cacheCommand(subcommand = "stats", options = {}) {
  const directory = options.dir ?? process.cwd();

  switch (subcommand) {
    case "stats": {
      await statsCommand(directory);
      break;
    }

    case "export": {
      await exportCommand(directory);
      break;
    }

    case "verify": {
      await verifyCommand();
      break;
    }

    case "prime": {
      const { loaded, skipped } = primeFromCatalog(directory);

      print(`Loaded ${loaded} catalog entr(ies), skipped ${skipped}.`);
      break;
    }

    case "clear": {
      // The local cache only. The catalog is committed and belongs to the
      // repository, so removing it is a deliberate edit, not a maintenance
      // command that can be run by accident.
      cacheClear();
      print(`Local cache cleared. ${CATALOG_FILE} was not touched.`);
      break;
    }

    default: {
      print("Usage: rule-mcp cache <stats|export|verify|prime|clear> [--dir <path>]");
      process.exitCode = 1;
    }
  }
}
