/**
 * @module cli/roles
 *
 * `rule-mcp roles` - read the merged role catalog and manage the user's
 * own layer of it (personas B.5).
 *
 * Three layers answer "which role is this": the embedded catalog, the user's
 * overlay, the project's. Reading three directories to work out which one won
 * is the kind of question a CLI should answer in one line, so `list` prints the
 * merged view with the layer beside each entry.
 *
 * The write side exists because the alternative was a hand-written JSON file
 * whose first contact with the validator happened after it was already on disk
 * and already wrong. Overlays are written as persona files (markdown with
 * frontmatter and a lenses list in the body), the same format the loader reads. `new` and `deprecate` write through the same validator the
 * loader uses, and refuse rather than leave an invalid file behind. The embedded
 * catalog is never edited: deprecating a built-in role writes the user's own
 * copy of it, which is what the precedence rules were for.
 *
 * @see module:core/review/overlays - where the layers live
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { formatPersonaFile } from "../core/review/_persona-file.js";
import { allRoles, roleById, validateRole } from "../core/review/_roles.js";
import { loadRoleOverlays } from "../core/review/_overlays.js";
import { getRuntimePaths } from "./paths.js";
import { color } from "./tui.js";

const print = (value) => process.stdout.write(`${value}\n`);

/** The user's own roles directory, the same path the overlay loader reads. */
function userRolesDir() {
  return join(getRuntimePaths().configDir, "roles");
}

/** Every role, merged, each carrying the layer that supplied it. */
function mergedRoles(projectDir) {
  const { roles: overlays, problems } = loadRoleOverlays({ projectDir });

  return {
    roles: allRoles(overlays).map((role) => ({ ...role, layer: role.layer ?? "embedded" })),
    problems,
  };
}

/** A comma-separated flag value as a list, empty when it was not given. */
function list(value) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** The merged catalog as a table a human can scan. */
function renderList(roles, problems) {
  const lines = [
    color("🎭 Review personas", "bold"),
    "",
    `| ${"Role".padEnd(16)} | ${"Layer".padEnd(8)} | ${"Status".padEnd(10)} | Years | Title`,
    `| ${"-".repeat(16)} | ${"-".repeat(8)} | ${"-".repeat(10)} | ----- | -----`,
  ];

  for (const role of roles) {
    lines.push(
      `| ${role.id.padEnd(16)} | ${role.layer.padEnd(8)} | ${role.status.padEnd(10)} | ` +
        `${String(role.yearsOfExperience).padStart(5)} | ${role.role}`,
    );
  }

  if (problems.length > 0) {
    lines.push("", color("Overlay files skipped:", "yellow"));

    for (const problem of problems) {
      lines.push(`  ${problem.file}: ${problem.reason}`);
    }
  }

  lines.push("", color("Tip: use `rule-mcp roles list --json` for automation output.", "dim"));

  return lines.join("\n");
}

/** One role, in full. */
function renderRole(role) {
  return [
    color(`🎭 ${role.id} - ${role.role}`, "bold"),
    "",
    `Layer:    ${role.layer}`,
    `Status:   ${role.status}${role.deprecatedBy ? ` (replaced by ${role.deprecatedBy})` : ""}`,
    `Version:  ${role.version}`,
    `Years:    ${role.yearsOfExperience}`,
    "",
    "Skills:",
    ...(role.skills ?? []).map((skill) => `  - ${skill}`),
    "",
    "Lenses:",
    ...(role.lenses ?? []).map((lens) => `  - ${lens}`),
    "",
    "Evidence skills:",
    ...(role.evidenceSkills ?? []).map((skill) => `  - ${skill}`),
  ].join("\n");
}

/** Refuse, saying what would have worked. */
function unknownRole(id, roles) {
  print(`Unknown role "${id}". Known: ${roles.map((role) => role.id).join(", ")}.`);
  process.exitCode = 1;
}

/** Write a role into the user layer, validated first. */
function writeUserRole(role) {
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
        print(
          `The user layer already has "${options.id}". Edit or delete ${join(userRolesDir(), `${options.id}.md`)}.`,
        );
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
