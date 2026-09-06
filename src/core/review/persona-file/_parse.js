/** @module core/review/persona-file/parse */

import { unquote } from "./_quote.js";

/** Fields that are numbers in a role, not strings. */
const NUMERIC_FIELDS = new Set(["yearsOfExperience", "version"]);

/** Fields that are lists in the frontmatter. Lenses live in the body instead. */
const LIST_FIELDS = new Set(["skills", "evidenceSkills", "aliases"]);

/** Nullable scalars: `deprecatedBy` is absent or `null` for non-deprecated roles. */
const NULLABLE_FIELDS = new Set(["deprecatedBy"]);

/**
 * Parse one persona file.
 *
 * Returns whatever it found. Validation is `validateRole`'s job, so a file
 * missing a field parses into a role missing a field and is reported by name
 * rather than throwing here.
 *
 * @param {string} text - the file content
 * @returns {object} the role
 */
export function parsePersonaFile(text) {
  const source = String(text ?? "");
  const framed = source.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  const frontmatter = framed ? framed[1] : "";
  const body = framed ? framed[2] : source;
  const role = {};
  const lines = frontmatter.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.trim().length === 0 || line.trimStart().startsWith("#")) {
      continue;
    }

    const entry = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);

    if (!entry) {
      continue;
    }

    const [, key, rest] = entry;

    if (LIST_FIELDS.has(key)) {
      const items = [];

      for (let next = index + 1; next < lines.length; next += 1) {
        const item = lines[next].match(/^\s+-\s+(.*)$/);

        if (!item) {
          break;
        }

        items.push(unquote(item[1]));
        index = next;
      }

      role[key] = items;
      continue;
    }

    if (rest.trim().length === 0) {
      continue;
    }

    if (NULLABLE_FIELDS.has(key)) {
      role[key] = /^null$/i.test(rest.trim()) ? null : unquote(rest);
      continue;
    }

    role[key] = NUMERIC_FIELDS.has(key) ? Number(unquote(rest)) : unquote(rest);
  }

  role.lenses = [...body.matchAll(/^\s*-\s+(.+?)\s*$/gm)].map(([, lens]) => lens);

  return role;
}
