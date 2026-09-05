/**
 * @module core/review-roles-overlays
 *
 * Where a role can come from besides this repository (personas plan A.2).
 *
 * One layer sits above the embedded catalog: the user's own
 * (`~/.rule-mcp/config/roles/*.json`). A match by id replaces the
 * embedded entry WHOLESALE - field-level merging would make "which lens applies
 * here" undebuggable.
 *
 * A project layer existed and is gone (ADR 082). It read roles out of the
 * repository, which made a persona repository content and needed a trust gate
 * to be safe; nothing this server reads now comes from a checkout, so neither
 * the layer nor the gate has a subject.
 *
 * An overlay that does not validate is reported and skipped. A bad JSON file
 * in a config directory must never stop the server from answering; the caller
 * decides how loudly to say so.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { validateRole } from "./review-roles.js";
import { getRuntimePaths } from "../cli/paths.js";

/** Where a user's own roles live: the rule config roles directory. */
function layerDirs({ home }) {
  const { configDir } = getRuntimePaths();

  return [{ layer: "user", dir: home ? join(home, "config", "roles") : join(configDir, "roles") }];
}

/**
 * Read the user's overlay layer.
 *
 * @param {{ home?: string }} [options]
 * @returns {{ roles: object[], problems: Array<{ file: string, layer: string, reason: string }> }}
 */
export function loadRoleOverlays(options = {}) {
  const roles = [];
  const problems = [];

  for (const { layer, dir } of layerDirs(options)) {
    if (!existsSync(dir)) {
      continue;
    }

    let entries;
    try {
      entries = readdirSync(dir).filter((name) => name.endsWith(".json"));
    } catch (error) {
      problems.push({ file: dir, layer, reason: `directory unreadable: ${error.message}` });
      continue;
    }

    for (const name of entries.sort()) {
      const file = join(dir, name);
      let parsed;
      try {
        parsed = JSON.parse(readFileSync(file, "utf8"));
      } catch (error) {
        problems.push({ file, layer, reason: `not valid JSON: ${error.message}` });
        continue;
      }

      const invalid = validateRole(parsed);

      if (invalid.length > 0) {
        problems.push({ file, layer, reason: invalid.join("; ") });
        continue;
      }

      roles.push({ ...parsed, layer });
    }
  }

  return { roles, problems };
}
