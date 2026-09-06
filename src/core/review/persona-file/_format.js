/** @module core/review/persona-file/format */

import { quote } from "./_quote.js";

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
