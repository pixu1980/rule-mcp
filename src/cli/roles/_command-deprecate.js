

/** @module cli/roles/command-deprecate - the `roles deprecate` subcommand */

import { roleById } from "../../core/review/roles/index.js";
import { loadRoleOverlays } from "../../core/review/_overlays.js";
import { unknownRole } from "./_render.js";
import { print, writeUserRole } from "./_store.js";

/** `roles deprecate <id> --by <role-id>`: write a deprecated copy into the user layer. */
export function deprecateSubcommand(roles, options) {
  const role = roleById(options.id, loadRoleOverlays({ projectDir: options.projectDir }).roles);

  if (!role) {
    unknownRole(options.id, roles);

    return;
  }

  if (!options.by) {
    print(`A deprecated role has to name its replacement: --by <role-id>.`);
    process.exitCode = 1;

    return;
  }

  if (roles.every((entry) => entry.id !== options.by)) {
    unknownRole(options.by, roles);

    return;
  }

  // The embedded catalog ships with this repository and is not edited; the
  // user's copy of the role is what carries their decision.
  const { layer, ...fields } = role;

  if (writeUserRole({ ...fields, status: "deprecated", deprecatedBy: options.by })) {
    print(`${role.id} is deprecated in the user layer, replaced by ${options.by} (was ${layer ?? "embedded"}).`);
  }
}
