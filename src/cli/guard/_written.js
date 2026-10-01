

/**
 * @module cli/guard/_written
 *
 * The text a file-writing tool carries, read off the payload.
 *
 * Its own module because both file hooks need it and one of them has to stay
 * cheap: the structural gate runs before every write and must not pull the
 * fingerprint dictionary in to read three fields.
 */

/**
 * Every piece of text a Write, Edit or MultiEdit payload carries.
 *
 * Write carries `content`, Edit carries `new_string`, MultiEdit carries a list
 * of them.
 *
 * @param {object} [input] - the hook's `tool_input`
 * @returns {string[]} the texts, in payload order
 */
export function writtenText(input = {}) {
  const parts = [input.content, input.new_string];

  for (const edit of input.edits ?? []) {
    parts.push(edit?.new_string);
  }

  return parts.filter((part) => typeof part === "string" && part.length > 0);
}
