

/** @module core/cache/catalog/io - where the committed catalog lives, read and written */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** The committed file. One name, so a reader always knows what they are looking at. */
export const CATALOG_FILE = "rule-catalog.json";

/** The format this module writes. Bumped when the shape changes, not the contents. */
export const CATALOG_VERSION = 1;

/**
 * @param {string} [directory] - Project root. Defaults to the working directory.
 * @returns {string} Absolute path of the catalog file.
 */
export function catalogPath(directory = process.cwd()) {
  return join(directory, CATALOG_FILE);
}

/**
 * Write the catalog where a person can read and commit it.
 *
 * @param {string} directory
 * @param {object} catalog
 * @returns {string} the path written
 */
export function writeCatalog(directory, catalog) {
  const file = catalogPath(directory);
  writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);

  return file;
}

/**
 * Read the catalog, or nothing when it is absent or unreadable.
 *
 * A corrupt catalog is ignored rather than fatal: it is an optimization, and an
 * optimization that can stop a server from starting is a liability.
 *
 * @param {string} [directory]
 * @returns {object|undefined}
 */
export function readCatalog(directory = process.cwd()) {
  try {
    const file = catalogPath(directory);

    if (!existsSync(file)) {
      return;
    }

    const parsed = JSON.parse(readFileSync(file, "utf8"));

    if (!Array.isArray(parsed?.entries)) {
      return;
    }

    return parsed;
  } catch {
    // A catalog that will not parse is one nobody can use, and it is not worth
    // stopping a server over.
  }
}
