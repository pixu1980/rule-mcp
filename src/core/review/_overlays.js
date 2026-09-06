/**
 * @module core/review/overlays
 *
 * Where a role can come from besides this repository (personas plan A.2).
 *
 * One layer sits above the embedded catalog: the user's own
 * (`~/.rule-mcp/config/roles/*.md`, the same persona-file format as the
 * embedded catalog - frontmatter with a lenses list in the body). Legacy
 * `*.json` overlays are still read so an existing set survives the format
 * change. A match by id replaces the embedded entry WHOLESALE - field-level
 * merging would make "which lens applies here" undebuggable.
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

import { parsePersonaFile } from "./_persona-file.js";
import { validateRole } from "./_roles.js";
import { getRuntimePaths } from "../../cli/paths.js";

/**
 * Where a user's own roles live.
 *
 * Overlays are user configuration, so they sit in the config roles directory
 * by default; `RULE_MCP_ROLES_OVERLAY_DIR` overrides it for tests,
 * containers, or a machine that wants the overlays elsewhere.
 */
function layerDirs({ home }) {
  const { configDir } = getRuntimePaths();
  const base =
    process.env.RULE_MCP_ROLES_OVERLAY_DIR || (home ? join(home, "config", "roles") : join(configDir, "roles"));

  return [{ layer: "user", dir: base }];
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
      entries = readdirSync(dir)
        .sort()
        .filter((name) => name.endsWith(".md") || name.endsWith(".json"));
    } catch (error) {
      problems.push({ file: dir, layer, reason: `directory unreadable: ${error.message}` });
      continue;
    }

    for (const name of entries) {
      const file = join(dir, name);
      let parsed;
      try {
        parsed = name.endsWith(".md")
          ? parsePersonaFile(readFileSync(file, "utf8"))
          : JSON.parse(readFileSync(file, "utf8"));
      } catch (error) {
        problems.push({
          file,
          layer,
          reason: name.endsWith(".md")
            ? `unreadable persona file: ${error.message}`
            : `not valid JSON: ${error.message}`,
        });
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
