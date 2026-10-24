

/**
 * @module core/release/pins
 *
 * Dependency specifiers that are not exact pins.
 *
 * The house rule is `"name": "x.y.z"`: a range (`^`, `~`, `>`, `*`) lets npm
 * pull a newer sub-dependency in without anyone deciding to, which is how a
 * build breaks on a dependency nobody chose to change. This reports the
 * specifiers that break the rule, deterministically, so `/rule-mcp-init` can name
 * them and `/rule-mcp-handoff` can refuse to call the tree clean while one exists.
 *
 * Protocol and path specifiers are not ranges and are never reported:
 * `workspace:`, `file:`, `link:`, `npm:` aliases and `catalog:` all name a
 * location the manifest owns, not a version a registry chooses.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

/** The manifest fields whose values are dependency specifiers. */
export const DEPENDENCY_FIELDS = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];

/** A bare `x.y.z`, optionally with a prerelease suffix: the only accepted shape. */
const EXACT = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u;

/** Specifiers that name a location the manifest owns, not a registry version. */
const LOCAL_PROTOCOL = /^(?:workspace|file|link|portal|npm|catalog):/u;

/**
 * The dependency specifiers in one manifest that are not exact pins.
 *
 * @param {string} projectDir
 * @param {string} [file]
 * @returns {Array<{ field: string, name: string, specifier: string }>}
 */
export function unpinnedDependencies(projectDir, file = "package.json") {
  let manifest;

  try {
    manifest = JSON.parse(readFileSync(join(projectDir, file), "utf8"));
  } catch {
    return [];
  }

  const offenders = [];

  for (const field of DEPENDENCY_FIELDS) {
    for (const [name, specifier] of Object.entries(manifest[field] ?? {})) {
      if (typeof specifier !== "string" || EXACT.test(specifier) || LOCAL_PROTOCOL.test(specifier)) {
        continue;
      }

      offenders.push({ field, name, specifier });
    }
  }

  return offenders;
}

/**
 * The one-line pin command for a package manager, so the fix is not left to memory.
 *
 * @param {string|null} manager
 * @param {string} name
 * @returns {string}
 */
export function exactPinCommand(manager, name) {
  return `${manager ?? "npm"} add ${name}@latest --save-exact`;
}
