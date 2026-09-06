/** @module cli/roles/store - where the user overlay roles live, read and written */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { formatPersonaFile } from "../../core/review/persona-file/index.js";
import { allRoles, validateRole } from "../../core/review/roles/index.js";
import { loadRoleOverlays } from "../../core/review/_overlays.js";
import { getRuntimePaths } from "../paths.js";

/** Write one line to stdout. */
export const print = (value) => process.stdout.write(`${value}\n`);

/** The user's own roles directory, the same path the overlay loader reads. */
export function userRolesDir() {
  return join(getRuntimePaths().configDir, "roles");
}

/** Every role, merged, each carrying the layer that supplied it. */
export function mergedRoles(projectDir) {
  const { roles: overlays, problems } = loadRoleOverlays({ projectDir });

  return {
    roles: allRoles(overlays).map((role) => ({ ...role, layer: role.layer ?? "embedded" })),
    problems,
  };
}

/** A comma-separated flag value as a list, empty when it was not given. */
export function list(value) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Write a role into the user layer, validated first. */
export function writeUserRole(role) {
  const problems = validateRole(role);

  if (problems.length > 0) {
    print(`Refusing to write an invalid role: ${problems.join("; ")}`);
    process.exitCode = 1;

    return false;
  }

  const directory = userRolesDir();

  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, `${role.id}.md`), formatPersonaFile(role));

  return true;
}
