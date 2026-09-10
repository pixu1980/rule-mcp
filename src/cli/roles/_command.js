

/** @module cli/roles/command - the roles CLI dispatcher */

import { existsSync } from "node:fs";
import { join } from "node:path";

import { roleById } from "../../core/review/roles/index.js";
import { loadRoleOverlays } from "../../core/review/_overlays.js";
import { renderList, renderRole, unknownRole } from "./_render.js";
import { list, mergedRoles, print, userRolesDir, writeUserRole } from "./_store.js";

/**
 * `roles list|show|new|deprecate`.
 *
 * @param {string} subcommand
 * @param {object} [options]
 * @param {string} [options.id] - role id for show, new and deprecate
 * @param {boolean} [options.json] - machine-readable output for list and show
 * @param {string} [options.projectDir] - project whose overlay layer to read
 * @param {string} [options.role] - new: the title, e.g. "Performance Hawk"
 * @param {string} [options.skills] - new: comma-separated skills
 * @param {number} [options.years] - new: years of experience
 * @param {string} [options.lenses] - new: comma-separated lenses
 * @param {string} [options.evidenceSkills] - new: comma-separated rule skills
 * @param {string} [options.by] - deprecate: the role that replaces this one
 */
export function rolesCommand(subcommand = "list", options = {}) {
  const { roles, problems } = mergedRoles(options.projectDir);

  switch (subcommand) {
    case "list": {
      if (options.json) {
        print(JSON.stringify({ roles, problems }, null, 2));

        return;
      }

      print(renderList(roles, problems));

      return;
    }

    case "show": {
      const role = roles.find((entry) => entry.id === options.id);

      if (!role) {
        unknownRole(options.id, roles);

        return;
      }

      print(options.json ? JSON.stringify(role, null, 2) : renderRole(role));

      return;
    }

    case "new": {
      if (!options.id) {
        print("Usage: rule-mcp roles new <id> --role <title> --skills <a,b,c> [--years N]");
        process.exitCode = 1;

        return;
      }

      if (existsSync(join(userRolesDir(), `${options.id}.md`))) {
        print(`The user layer already has "${options.id}". Edit or delete ${join(userRolesDir(), `${options.id}.md`)}.`);
        process.exitCode = 1;

        return;
      }

      if (!options.role || list(options.skills).length === 0) {
        print(`A role needs a title and at least one skill: --role "<title>" --skills "<a,b>".`);
        process.exitCode = 1;

        return;
      }

      const created = {
        id: options.id,
        role: options.role,
        yearsOfExperience: Number(options.years) > 0 ? Math.trunc(Number(options.years)) : 10,
        skills: list(options.skills),
        evidenceSkills: list(options.evidenceSkills),
        lenses: list(options.lenses),
        status: "active",
        version: 1,
        deprecatedBy: null,
      };

      if (writeUserRole(created)) {
        print(`Wrote ${join(userRolesDir(), `${created.id}.md`)}. It takes precedence over the embedded catalog.`);
      }

      return;
    }

    case "deprecate": {
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

      return;
    }

    default: {
      print("Usage: rule-mcp roles <list|show|new|deprecate> [id] [flags]");
      process.exitCode = 1;
    }
  }
}
