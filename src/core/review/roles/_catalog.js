/** @module core/review/roles/catalog */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

import { parsePersonaFile } from "../persona-file/index.js";
import { validateRole } from "./_validate.js";

const PERSONA_DIR = new URL("../../../../personas/", import.meta.url);
const ROLES_DIR = process.env.RULE_MCP_ROLES_DIR || PERSONA_DIR;

/**
 * The personas live as one persona file per role in `./personas/` (markdown
 * with frontmatter and a lenses bullet list in the body - see
 * {@link module:core/persona-file}). The server reads the whole folder at
 * startup, so adding or removing a file adds or removes the persona (and its
 * plan/audit/review surfaces) everywhere: the MCP prompts, the slash commands,
 * the tools and the census. Order is by filename, so the catalog order is
 * stable across machines and a new file slots in without renumbering anything.
 */
export function loadPersonaCatalog(dir = ROLES_DIR) {
  const base = dir instanceof URL ? dir : pathToFileURL(join(dir, "/"));
  const roles = [];
  const problems = [];

  if (!existsSync(base)) {
    return { roles, problems: [{ file: fileURLToPath(base), reason: "the personas directory does not exist" }] };
  }

  let names;
  try {
    names = readdirSync(base)
      .filter((name) => name.endsWith(".md"))
      .sort((a, b) => a.localeCompare(b));
  } catch (error) {
    return { roles, problems: [{ file: fileURLToPath(base), reason: `directory unreadable: ${error.message}` }] };
  }

  for (const name of names) {
    const file = new URL(name, base);
    let role;

    try {
      role = parsePersonaFile(readFileSync(file, "utf8"));
    } catch (error) {
      problems.push({ file: fileURLToPath(file), reason: `unreadable: ${error.message}` });
      continue;
    }

    const invalid = validateRole(role);

    if (invalid.length > 0) {
      problems.push({ file: fileURLToPath(file), reason: invalid.join("; ") });
      continue;
    }

    if (role.id !== name.replace(/\.md$/, "")) {
      problems.push({ file: fileURLToPath(file), reason: `id "${role.id}" does not match the file name` });
      continue;
    }

    roles.push(role);
  }

  return { roles, problems };
}

/**
 * Read the catalog and fail loudly if a shipped persona file is broken.
 * Embedded catalog problems are bugs, unlike user overlay problems.
 */
function readEmbeddedPersonas() {
  const { roles, problems } = loadPersonaCatalog();

  if (roles.length === 0) {
    throw new Error(`The embedded persona catalog is empty (${problems.map((p) => p.file).join(", ")})`);
  }

  if (problems.length > 0) {
    throw new Error(`Invalid embedded persona catalog:\n${problems.map((p) => `${p.file}: ${p.reason}`).join("\n")}`);
  }

  return roles;
}

/** The shipped personas, loaded from disk at startup. */
export const EMBEDDED_ROLES = readEmbeddedPersonas();
