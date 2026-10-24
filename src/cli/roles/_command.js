

/** @module cli/roles/command - the roles CLI dispatcher */

import { renderList, renderRole, unknownRole } from "./_render.js";
import { newSubcommand } from "./_command-new.js";
import { deprecateSubcommand } from "./_command-deprecate.js";
import { mergedRoles, print } from "./_store.js";

/** `roles list`: the table, or the merged catalog as JSON. */
function listSubcommand(roles, problems, options) {
  if (options.json) {
    print(JSON.stringify({ roles, problems }, null, 2));

    return;
  }

  print(renderList(roles, problems));
}

/** `roles show <id>`: one role, in full. */
function showSubcommand(roles, options) {
  const role = roles.find((entry) => entry.id === options.id);

  if (!role) {
    unknownRole(options.id, roles);

    return;
  }

  print(options.json ? JSON.stringify(role, null, 2) : renderRole(role));
}

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
 * @param {string} [options.evidenceSkills] - new: comma-separated rule-mcp skills
 * @param {string} [options.by] - deprecate: the role that replaces this one
 */
export function rolesCommand(subcommand = "list", options = {}) {
  const { roles, problems } = mergedRoles(options.projectDir);

  switch (subcommand) {
    case "list": {
      listSubcommand(roles, problems, options);

      return;
    }

    case "show": {
      showSubcommand(roles, options);

      return;
    }

    case "new": {
      newSubcommand(options);

      return;
    }

    case "deprecate": {
      deprecateSubcommand(roles, options);

      return;
    }

    default: {
      print("Usage: rule-mcp roles <list|show|new|deprecate> [id] [flags]");
      process.exitCode = 1;
    }
  }
}
