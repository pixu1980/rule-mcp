

/**
 * @module scripts/reports/census/_env-scan
 *
 * Every `RULE_MCP_*` variable the shipped code reads, and the modules
 * that read it.
 *
 * The alternative was a second hand-kept list beside the hand-written table in
 * `docs/05-env-variables.md`, which is two copies of one fact and the copy
 * without a generator behind it goes stale first. Scanning `src/` and `bin/`
 * makes the generated half derived, and a variable the code reads but the table
 * never documents shows up as a count that disagrees.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { ROOT } from "./_registries.mjs";

/** The directories that ship. Scripts set variables rather than read them. */
const SOURCE_DIRS = ["src", "bin"];

/**
 * Tests are co-located with the module they cover (ADR 070), so the shipped
 * code and its tests share a tree. A test sets a variable to drive a case; it
 * is not a place the behavior is read, and listing it would bury the module
 * that answers the knob under the suites that exercise it.
 */
const TEST_PATH = /(?:^|[/\\])__tests__[/\\]|\.(?:test|fixture|corpus)\.m?js$/;

/** A variable name as it appears in code and in the documentation table alike. */
const NAME = /RULE_MCP_[A-Z0-9_]+/g;

/**
 * Every JavaScript file under one directory.
 *
 * @param {string} dir - absolute path
 * @returns {string[]} absolute paths, depth first
 */
function sourceFiles(dir) {
  const found = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name !== "__tests__") {
        found.push(...sourceFiles(path));
      }

      continue;
    }

    if ((entry.name.endsWith(".js") || entry.name.endsWith(".mjs")) && !TEST_PATH.test(path)) {
      found.push(path);
    }
  }

  return found;
}

/**
 * The variables the code reads, each with the modules that name it.
 *
 * @returns {Map<string, string[]>} variable name to repository-relative paths
 */
export function envVarsInCode() {
  const readers = new Map();

  for (const dir of SOURCE_DIRS) {
    for (const file of sourceFiles(join(ROOT, dir))) {
      const path = relative(ROOT, file);

      for (const name of new Set(readFileSync(file, "utf8").match(NAME) ?? [])) {
        readers.set(
          name,
          [...(readers.get(name) ?? []), path].sort((a, b) => a.localeCompare(b)),
        );
      }
    }
  }

  return new Map([...readers.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

/**
 * The variables one document names outside a generated block, which is what
 * "documented" means: the hand-written table, not the census restating itself.
 *
 * @param {string} text - the document
 * @param {string} marker - the census marker whose block is excluded
 * @returns {Set<string>}
 */
export function documentedEnvVars(text, marker) {
  const begin = text.indexOf(`<!-- census:begin:${marker} -->`);
  const end = text.indexOf(`<!-- census:end:${marker} -->`);
  const prose = begin !== -1 && end > begin ? text.slice(0, begin) + text.slice(end) : text;

  return new Set(prose.match(NAME) ?? []);
}
