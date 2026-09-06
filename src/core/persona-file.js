/**
 * @module core/persona-file
 *
 * One persona, one file: read and write a persona as markdown.
 *
 * The catalog is a directory (`src/personas/*.md`, plus the user overlay layer
 * `~/.rule-mcp/config/roles/*.md`) read by the server at startup; adding
 * or removing a persona is a filesystem op, not a code change. This module is
 * the only thing that knows the file format.
 *
 * Structured fields sit in the frontmatter; the lenses sit in the body as a
 * bullet list. That split is not cosmetic. A lens is a sentence written for a
 * person - "caches: hit rate, invalidation, and what they hide" - and a bare
 * YAML list item carrying a colon parses as a map. Prose belongs in prose.
 *
 * Deliberately dependency-free apart from node built-ins: `review-roles.js` is
 * imported by the prompt registry, which is imported by the command generator,
 * and reaching for the skill frontmatter parser would pull the whole tool graph
 * into that chain.
 */

/** Fields that are numbers in a role, not strings. */
const NUMERIC_FIELDS = new Set(["yearsOfExperience", "version"]);

/** Fields that are lists in the frontmatter. Lenses live in the body instead. */
const LIST_FIELDS = new Set(["skills", "evidenceSkills", "aliases"]);

/** Nullable scalars: `deprecatedBy` is absent or `null` for non-deprecated roles. */
const NULLABLE_FIELDS = new Set(["deprecatedBy"]);

/** Strip one layer of matching quotes and unescape what the writer escaped. */
function unquote(raw) {
  const value = raw.trim();

  if (value.length > 1 && value.startsWith('"') && value.endsWith('"')) {
    return value
      .slice(1, -1)
      .replaceAll(String.raw`\"`, '"')
      .replaceAll("\\\\", "\\");
  }

  return value;
}

/** Quote a scalar so a colon, a comma or a hash in it cannot change the parse. */
function quote(value) {
  return `"${String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll('"', String.raw`\"`)}"`;
}

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

/**
 * Serialize a persona back to its file form.
 *
 * Byte-stable for a given role, so the generated catalog and a hand-written
 * file are the same thing and `roles new` produces what the loader expects.
 *
 * @param {object} role
 * @returns {string}
 */
export function formatPersonaFile(role) {
  const lines = [
    "---",
    `id: ${quote(role.id)}`,
    `role: ${quote(role.role)}`,
    `yearsOfExperience: ${role.yearsOfExperience}`,
    `status: ${quote(role.status)}`,
    `version: ${role.version}`,
  ];

  if (role.deprecatedBy) {
    lines.push(`deprecatedBy: ${quote(role.deprecatedBy)}`);
  }

  for (const key of ["skills", "evidenceSkills", "aliases"]) {
    const items = role[key] ?? [];

    lines.push(`${key}:`);

    for (const item of items) {
      lines.push(`  - ${quote(item)}`);
    }
  }

  lines.push(
    "---",
    "",
    `# ${role.role}`,
    "",
    "## Lenses",
    "",
    "What this role looks at. One line each, written for a person to read.",
    "",
    ...(role.lenses ?? []).map((lens) => `- ${lens}`),
    "",
  );

  return lines.join("\n");
}
