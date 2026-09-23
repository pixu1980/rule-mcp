

/** @module cli/roles/command-new - the `roles new` subcommand */

import { existsSync } from "node:fs";
import { join } from "node:path";

import { list, print, userRolesDir, writeUserRole } from "./_store.js";

/** `roles new <id> --role <title> --skills <a,b,c>`: write a role into the user layer. */
export function newSubcommand(options) {
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
}
