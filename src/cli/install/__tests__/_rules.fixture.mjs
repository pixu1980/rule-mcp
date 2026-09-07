/**
 * Regression: uninstall→install cycles must not accumulate blank lines in
 * agent instruction files (CLAUDE.md, GEMINI.md, AGENTS.md, .cursorrules).
 *
 * The old install.sh prefixed RULES_CONTENT with a "\n", and uninstall.sh's
 * sed range-delete left that blank line behind - so every cycle grew the file
 * by one empty line. The fix:
 *   - install: append_rules_block() normalizes trailing newlines and inserts
 *     exactly one separator line;
 *   - uninstall: remove_rules_block() collapses trailing blank lines after
 *     deleting the marker block.
 *
 * This test extracts the REAL functions from scripts/install.sh and
 * scripts/uninstall.sh and runs them in a sandbox, so it guards the actual
 * script code, not a copy of the logic.
 */
import { readFileSync } from "node:fs";

/** Read a repo script relative to the repo root. */
export function readScript(path) {
  return readFileSync(new URL(`../../../../${path}`, import.meta.url), "utf8");
}

export const installSh = readScript("scripts/install.sh");
export const uninstallSh = readScript("scripts/uninstall.sh");

/** Extract a `name() { ... }` bash function (brace-balanced) from script source. */
export function extractBashFunction(source, name) {
  const start = source.indexOf(`${name}() {`);
  if (start === -1) {
    return null;
  }
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < source.length; index++) {
    if (source[index] === "{") {
      depth++;
    } else if (source[index] === "}") {
      depth--;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }
  return null;
}
