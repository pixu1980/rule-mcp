/**
 * @module core/skills/yaml-list
 *
 * The scalar shapes a SKILL.md frontmatter key can carry: a list written
 * inline or as a block, and a boolean written the way YAML allows.
 *
 * Deliberately not a YAML parser. The frontmatter of a skill is a handful of
 * known keys, and a dependency that can parse anchors and merge keys would be
 * a dependency that can also be surprised by them.
 */

/** Strip one layer of matching quotes from a scalar. */
export function unquote(text) {
  return text
    .trim()
    .replace(/^"(.*)"$/, "$1")
    .replace(/^'(.*)'$/, "$1");
}

/**
 * The entries of an inline list: `[a, b]` or a bare `a, b`.
 *
 * @param {string} text - everything after the colon
 * @returns {string[]}
 */
export function inlineList(text) {
  const inner = text.trim().replace(/^\[(.*)]$/s, "$1");

  if (inner.trim() === "") {
    return [];
  }

  return inner
    .split(",")
    .map((entry) => unquote(entry))
    .filter((entry) => entry !== "");
}

/**
 * The entries of a block list: the `- item` lines under a key.
 *
 * @param {string[]} lines - the frontmatter, split
 * @param {number} start - the index of the key line
 * @returns {string[]}
 */
export function blockList(lines, start) {
  const values = [];

  for (let index = start + 1; index < lines.length; index++) {
    const line = lines[index].trim();

    if (line.startsWith("- ")) {
      values.push(unquote(line.slice(2)));
      continue;
    }

    if (!line.startsWith("-")) {
      break;
    }
  }

  return values;
}

/**
 * A list key in either shape, or null when the line is not that key.
 *
 * @param {string[]} lines @param {number} index @param {string} key
 * @returns {string[]|null}
 */
export function listAt(lines, index, key) {
  const match = lines[index].match(new RegExp(String.raw`^${key}:\s*(.*)$`));

  if (!match) {
    return null;
  }

  return match[1].trim() === "" ? blockList(lines, index) : inlineList(match[1]);
}

/** YAML truthiness for the booleans a skill declares. */
export function yamlBoolean(text) {
  return /^(?:true|yes|on)$/i.test(unquote(text));
}
