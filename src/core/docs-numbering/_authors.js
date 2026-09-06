import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { adrAuthor } from "../../tools/adr/index.js";
import { FAMILIES, documentsIn } from "./_families.js";
import { addedBy } from "./_git.js";

/** Authors that name a program rather than a person (ADR 086). */
const TOOL_AUTHORS = new Set(["rule-mcp"]);

/** The `- **Author**:` bullet, in both punctuations the ADRs use. */
const AUTHOR_LINE = /^- \*\*Author(\*\*:|:\*\*) *(.*)$/m;

/** The `- **Tags**:` bullet the author line is filed next to. */
const TAGS_LINE = /^- \*\*Tags(\*\*:|:\*\*) *(.*)$/m;

/**
 * ADRs whose author names a tool, or names nobody at all.
 *
 * The decision this repairs is ADR 086: the field answers "who do I ask", and
 * for every ADR written before that it answered with the name of a program.
 * The author is taken from the commit that added the file, because that is the
 * only record of who wrote it; a file git has never seen falls back to the
 * current git identity.
 *
 * A document with no author line and no tags bullet is left alone: there is
 * nowhere to put the line that would not be a guess about its header.
 *
 * @param {string} projectDir
 * @returns {Array<{file: string, current: string, author: string}>}
 */
export function authorsToName(projectDir) {
  const family = FAMILIES.find((entry) => entry.label === "ADR");
  const out = [];

  for (const document of documentsIn(projectDir, family)) {
    const body = readFileSync(join(projectDir, document.relativePath), "utf8");
    const current = AUTHOR_LINE.exec(body)?.[2]?.trim() ?? "";

    if (current && !TOOL_AUTHORS.has(current)) {
      continue;
    }

    if (!current && !TAGS_LINE.test(body)) {
      continue;
    }

    out.push({
      file: document.relativePath,
      current,
      author: addedBy(projectDir, document.relativePath) || adrAuthor(),
    });
  }

  return out;
}

/**
 * Put the author into one ADR, replacing the tool name or adding the line.
 *
 * @param {string} file - absolute path
 * @param {string} author
 * @returns {boolean} whether the file changed
 */
export function nameAuthorIn(file, author) {
  const body = readFileSync(file, "utf8");
  const existing = AUTHOR_LINE.exec(body);
  const next = existing
    ? body.replace(AUTHOR_LINE, `- **Author${existing[1]} ${author}`)
    : body.replace(
        TAGS_LINE,
        (line, punctuation, tags) => `- **Tags${punctuation} ${tags}\n- **Author${punctuation} ${author}`,
      );

  if (next === body) {
    return false;
  }

  writeFileSync(file, next);

  return true;
}
