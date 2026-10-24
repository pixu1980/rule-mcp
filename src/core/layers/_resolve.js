

/**
 * @module core/layers/resolve
 *
 * Which copy of a skill or a persona answers (ADR 089).
 *
 * The layers are read in order and a later one replaces an earlier one
 * WHOLESALE: field-level merging makes "which rule applies here" undebuggable.
 * Every resolved entry carries the layer it came from, so every surface can
 * say where what it just ran came from.
 *
 * A layer directory that is not there is the normal case, not a fault. An
 * entry that is there but does not parse is reported and skipped, because one
 * malformed file must never stop the server answering about the rest.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { parseSkillFrontmatter } from "../skills/_frontmatter.js";
import { parsePersonaFile } from "../review/persona-file/index.js";
import { validateRole } from "../review/roles/_validate.js";
import { layerSources } from "./_sources.js";

/** A Map that also carries what it could not read. */
function resolution() {
  const map = new Map();
  map.problems = [];

  return map;
}

/** The entries of a directory, sorted, or null when it is not there. */
function entriesOf(dir, problems, layer) {
  if (!existsSync(dir)) {
    return null;
  }

  try {
    return readdirSync(dir, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
  } catch (error) {
    problems.push({ file: dir, layer, reason: `directory unreadable: ${error.message}` });

    return null;
  }
}

/**
 * Every skill that resolves, by name, with the layer that won.
 *
 * A skill is a directory carrying a SKILL.md. The name is the directory name:
 * a custom layer is the user's namespace, so it is not held to the `rule-mcp-`
 * prefix the bundled catalog uses.
 *
 * @param {{ cwd?: string }} [options]
 * @returns {Map<string, { name: string, layer: string, dir: string, meta: object }>}
 */
export function resolveSkillDirs(options = {}) {
  const resolved = resolution();

  for (const { layer, dir } of layerSources("skills", options)) {
    const entries = entriesOf(dir, resolved.problems, layer);

    if (!entries) {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const skillDir = join(dir, entry.name);
      const file = join(skillDir, "SKILL.md");

      if (!existsSync(file)) {
        continue;
      }

      try {
        resolved.set(entry.name, { name: entry.name, layer, dir: skillDir, meta: parseSkillFrontmatter(readFileSync(file, "utf8")) });
      } catch (error) {
        resolved.problems.push({ file, layer, reason: `unreadable skill: ${error.message}` });
      }
    }
  }

  return resolved;
}

/**
 * Every persona that resolves, by id, with the layer that won.
 *
 * A persona is a `<id>.md` file whose frontmatter names the same id. A file
 * that does not validate is reported and skipped: an invalid persona must
 * never reach a prompt.
 *
 * @param {{ cwd?: string }} [options]
 * @returns {Map<string, { id: string, layer: string, file: string, role: object }>}
 */
export function resolvePersonaFiles(options = {}) {
  const resolved = resolution();

  for (const { layer, dir } of layerSources("personas", options)) {
    const entries = entriesOf(dir, resolved.problems, layer);

    if (!entries) {
      continue;
    }

    for (const entry of entries) {
      if (!(entry.isFile() && entry.name.endsWith(".md"))) {
        continue;
      }

      const file = join(dir, entry.name);
      let role;

      try {
        role = parsePersonaFile(readFileSync(file, "utf8"));
      } catch (error) {
        resolved.problems.push({ file, layer, reason: `unreadable persona file: ${error.message}` });
        continue;
      }

      const invalid = validateRole(role);

      if (invalid.length > 0) {
        resolved.problems.push({ file, layer, reason: invalid.join("; ") });
        continue;
      }

      const id = entry.name.replace(/\.md$/, "");

      if (role.id !== id) {
        resolved.problems.push({ file, layer, reason: `id "${role.id}" does not match the file name` });
        continue;
      }

      resolved.set(id, { id, layer, file, role: { ...role, layer } });
    }
  }

  return resolved;
}
