

// Auto-extracted - frontmatter parser shared by the skill store and router.

import { listAt, yamlBoolean } from "./_yaml-list.js";

/** The list keys a skill declares: the rules it owns and the skills it inherits (ADR 089). */
const LIST_KEYS = ["tags", "guardrails", "inherits"];

/**
 * Parse the YAML frontmatter of a SKILL.md file.
 *
 * @param {string} content
 * @returns {object}
 */
export function parseSkillFrontmatter(content) {
  const result = {};
  const match = content?.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);

  if (!match) {
    return result;
  }

  const frontmatter = match[1];
  const lines = frontmatter.split("\n");

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const trimmed = line.trim();
    // name: inline scalar
    const nameMatch = line.match(/^name:\s*(.+)$/);

    if (nameMatch) {
      result.name = nameMatch[1].trim();
      continue;
    }
    // description: could be inline or block scalar
    const descInline = line.match(/^description:\s*(.+)$/);

    if (descInline) {
      const afterColon = descInline[1];

      if (afterColon.startsWith("|") || afterColon.startsWith(">")) {
        // Literal or folded block scalar - collect indented continuation lines
        const isFolded = afterColon.startsWith(">");
        const parts = [];

        for (let index_ = index + 1; index_ < lines.length; index_++) {
          const nextLine = lines[index_];
          // Block ends when a line is NOT indented (starts at col 0 or is empty)
          if (nextLine.length === 0 || (!nextLine.startsWith(" ") && !nextLine.startsWith("\t"))) {
            break;
          }

          const stripped = nextLine.trim();

          if (stripped.length > 0 || !isFolded) {
            parts.push(stripped);
          }
        }

        result.description = isFolded ? parts.join(" ").replaceAll(/\s+/g, " ") : parts.join("\n");

        if (result.description) {
          result.description = result.description.trim();
        }
      } else {
        // Inline scalar
        result.description = afterColon.trim();
      }

      continue;
    }
    // tags / guardrails / inherits: a YAML list, inline or block
    const listKey = LIST_KEYS.find((key) => listAt(lines, index, key) !== null);

    if (listKey) {
      const values = listAt(lines, index, listKey);

      // `tags` keeps its old shape - absent when empty - because the routing
      // corpus counts on it. The two new keys report an empty list as one: a
      // skill saying it defines no rules is not a skill that failed to say.
      if (listKey !== "tags" || values.length > 0) {
        result[listKey] = values;
      }

      continue;
    }
    // exposeTool: whether a custom skill also mints a tool (ADR 089, default no)
    const exposeMatch = line.match(/^exposeTool:\s*(.+)$/);

    if (exposeMatch) {
      result.exposeTool = yamlBoolean(exposeMatch[1]);
      continue;
    }
    // frameworks: inline scalar
    const fwMatch = line.match(/^frameworks:\s*(.+)$/);

    if (fwMatch) {
      result.frameworks = fwMatch[1].split(",").map((s) => s.trim().replaceAll(/^\[|\]$/g, ""));
    }
  }

  return result;
}
