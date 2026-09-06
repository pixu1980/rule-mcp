/**
 * @module core/review-roles
 *
 * The expert review personas: who can be asked to audit this project, what
 * they know, and what they look at (personas plan, phase A.1).
 *
 * A persona is data, not a prompt. One registry entry fills one template, and
 * every surface - the MCP prompt, the agent command, the skill, the tool -
 * is generated from that entry, so a role gains a lens in one place and
 * every entry point says the same thing.
 *
 * `status` is the lifecycle: `active` roles are generated onto every surface,
 * `proposed` ones wait in the catalog until someone asks for them, and
 * `deprecated` ones disappear from the surfaces but keep their entry and
 * their documents - deleting an id would make an old audit unattributable.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

import { parsePersonaFile } from "./persona-file.js";

const PERSONA_DIR = new URL("../roles/", import.meta.url);
const ROLES_DIR = process.env.RULE_MCP_ROLES_DIR || PERSONA_DIR;

/** Every field a role must have, and what counts as valid. */
const REQUIRED_STRING_FIELDS = ["id", "role"];
const VALID_STATUS = new Set(["active", "proposed", "deprecated"]);

/**
 * The personas live as one persona file per role in `src/roles/` (markdown
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

/**
 * Validate one role entry. Returns the problems found, empty when valid -
 * an overlay file is reported and skipped, never fatal, so the caller needs
 * the reasons rather than an exception.
 *
 * @param {object} role
 * @returns {string[]} problems, empty when the role is valid
 */
export function validateRole(role) {
  const problems = [];

  if (!role || typeof role !== "object") {
    return ["not an object"];
  }

  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof role[field] !== "string" || role[field].trim() === "") {
      problems.push(`${field} must be a non-empty string`);
    }
  }

  if (typeof role.id === "string" && !/^[a-z][a-z0-9-]*$/.test(role.id)) {
    problems.push("id must be kebab-case");
  }

  if (!Number.isInteger(role.yearsOfExperience) || role.yearsOfExperience <= 0) {
    problems.push("yearsOfExperience must be a positive integer");
  }

  if (!Array.isArray(role.skills) || role.skills.length === 0) {
    problems.push("skills must be a non-empty array");
  }

  if (role.evidenceSkills !== undefined && !Array.isArray(role.evidenceSkills)) {
    problems.push("evidenceSkills must be an array when present");
  }

  if (role.lenses !== undefined && !Array.isArray(role.lenses)) {
    problems.push("lenses must be an array when present");
  }

  if (role.aliases !== undefined && !Array.isArray(role.aliases)) {
    problems.push("aliases must be an array when present");
  }

  if (!VALID_STATUS.has(role.status)) {
    problems.push(`status must be one of ${[...VALID_STATUS].join(", ")}`);
  }

  if (!Number.isInteger(role.version) || role.version <= 0) {
    problems.push("version must be a positive integer");
  }

  if (role.status === "deprecated" && !role.deprecatedBy) {
    problems.push("a deprecated role must name the role that replaces it in deprecatedBy");
  }

  return problems;
}

/**
 * Every role, embedded plus overlays, merged by id.
 *
 * @param {Array<object>} [overlays] - higher-precedence entries, lowest first
 * @returns {object[]} roles in catalog order, overlays replacing by id
 */
export function allRoles(overlays = []) {
  const byId = new Map(EMBEDDED_ROLES.map((role) => [role.id, role]));

  for (const role of overlays) {
    byId.set(role.id, role);
  }

  return [...byId.values()];
}

/**
 * The roles every generated surface carries.
 *
 * @param {Array<object>} [overlays]
 * @returns {object[]} roles with status "active"
 */
export function activeRoles(overlays = []) {
  return allRoles(overlays).filter((role) => role.status === "active");
}

/**
 * One role by id, whatever its status - a deprecated role still owns its
 * documents, so looking it up has to keep working.
 *
 * @param {string} id
 * @param {Array<object>} [overlays]
 * @returns {object|undefined}
 */
export function roleById(id, overlays = []) {
  return allRoles(overlays).find((role) => role.id === id);
}

/**
 * Frames that turn a subject into a persona request, English and Italian.
 *
 * "security headers" is work; "act as a security engineer" is a request for a
 * role's lenses and its three documents. The frame is what separates them, so a
 * bare role id never triggers on its own.
 */
const PERSONA_FRAMES = [
  "act as",
  "acting as",
  "as a",
  "as an",
  "in the role of",
  "you are a",
  "you are an",
  "agisci come",
  "comportati come",
  "nel ruolo di",
  "fai da",
  "come un",
  "come una",
];

/** Every name a role answers to: its id, its title, and the aliases it declares. */
function roleNames(role) {
  return [role.id, role.id.replaceAll("-", " "), role.role, ...(role.aliases ?? [])]
    .filter(Boolean)
    .map((name) => String(name).toLowerCase());
}

/**
 * Which review persona a prompt is asking for, if any (personas D.3).
 *
 * Two ways to qualify. A multi-word name - "security engineer", "architetto
 * software" - is specific enough on its own: nobody writes it about a subject.
 * A single word - "security", "privacy" - is a subject as often as a role, so it
 * counts only inside a persona frame.
 *
 * @param {string} prompt
 * @param {Array<object>} [overlays] - higher-precedence roles, lowest first
 * @returns {object|undefined} the role, or undefined when the prompt is ordinary work
 */
export function detectRole(prompt, overlays = []) {
  const text = String(prompt ?? "").toLowerCase();

  if (text.trim() === "") {
    return;
  }

  // Word-boundary matching: "ai" matches a standalone "ai", never the "ai"
  // inside "fai" / "again", and a frame like "come un" does not fire inside
  // "become unfettered".
  const wordBoundary = (word) => new RegExp(String.raw`\b${word.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)}\b`);
  const framed = PERSONA_FRAMES.some((frame) => wordBoundary(frame).test(text));

  for (const role of activeRoles(overlays)) {
    for (const name of roleNames(role)) {
      if (!wordBoundary(name).test(text)) {
        continue;
      }

      if (name.includes(" ") || framed) {
        return role;
      }
    }
  }
}
