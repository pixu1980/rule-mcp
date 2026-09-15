

/**
 * @module core/review/overlays
 *
 * Where a role can come from besides this repository (personas plan A.2).
 *
 * Two layers sit above the embedded catalog, in the order skills use
 * (ADR 089): the project's own (`./.rule-mcp/personas/*.md`, versioned
 * with the code it judges) and then the machine owner's
 * (`~/.rule-mcp/personas/*.md`), which therefore has the last word over
 * any repository. A match by id replaces the embedded entry WHOLESALE -
 * field-level merging would make "which lens applies here" undebuggable.
 *
 * `~/.rule-mcp/config/roles/` is read as well, after both, so a set kept
 * there still answers. It also accepts `*.json`, which the persona directories
 * do not.
 *
 * An overlay that does not validate is reported and skipped. A bad file in a
 * config directory must never stop the server from answering; the caller
 * decides how loudly to say so.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { parsePersonaFile } from "./persona-file/index.js";
import { validateRole } from "./roles/_validate.js";
import { getRuntimePaths } from "../../cli/paths/index.js";
import { resolvePersonaFiles } from "../layers/_resolve.js";

/**
 * The legacy overlay directory, read after the persona layers.
 *
 * `RULE_MCP_ROLES_OVERLAY_DIR` overrides it for tests, containers, or a
 * machine that keeps its overlays elsewhere.
 */
function layerDirs({ home }) {
  const { configDir } = getRuntimePaths();
  const base = process.env.RULE_MCP_ROLES_OVERLAY_DIR || (home ? join(home, "config", "roles") : join(configDir, "roles"));

  return [{ layer: "user", dir: base }];
}

/**
 * Read every layer above the embedded catalog, lowest precedence first.
 *
 * @param {{ home?: string, projectDir?: string }} [options]
 * @returns {{ roles: object[], problems: Array<{ file: string, layer: string, reason: string }> }}
 */
export function loadRoleOverlays(options = {}) {
  const roles = [];
  const problems = [];

  // The persona directories: project, then user. Native is the embedded
  // catalog the caller already has, so it is not an overlay.
  const layered = resolvePersonaFiles(options.projectDir ? { cwd: options.projectDir } : {});

  problems.push(...layered.problems);

  for (const layer of ["project", "user"]) {
    for (const entry of layered.values()) {
      if (entry.layer === layer) {
        roles.push(entry.role);
      }
    }
  }

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
        parsed = name.endsWith(".md") ? parsePersonaFile(readFileSync(file, "utf8")) : JSON.parse(readFileSync(file, "utf8"));
      } catch (error) {
        problems.push({
          file,
          layer,
          reason: name.endsWith(".md") ? `unreadable persona file: ${error.message}` : `not valid JSON: ${error.message}`,
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
