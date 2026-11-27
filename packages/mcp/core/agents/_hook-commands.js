/** @module core/agents/hook-commands - the marker, the hook command line and the command classifiers */

/** Marks our entries so merge and uninstall can find them without touching others. */
export const HOOK_MARKER = "rule-mcp-guard";

/**
 * One word of a hook command line.
 *
 * Hosts hand the line to a shell - Git Bash, for Claude Code on Windows - where
 * an unquoted backslash is an escape: `C:\Users\me\rule-mcp.js` reaches node as
 * `C:Usersmerule-mcp.js`. A Windows path is written with forward slashes, which
 * node and Windows both accept, and always quoted. Any other word is quoted only
 * when it holds whitespace.
 *
 * @param {string} part
 * @returns {string}
 */
export function shellWord(part) {
  if (part.includes("\\")) {
    return JSON.stringify(part.replaceAll("\\", "/"));
  }

  return /\s/.test(part) ? JSON.stringify(part) : part;
}

/**
 * The shell line every hook writer builds, so a quoting fix cannot land in one
 * writer and miss the other.
 *
 * @param {string[]} parts - launcher command, its args, then the guard words
 * @returns {string}
 */
export function shellLine(parts) {
  return parts.map(shellWord).join(" ");
}

/**
 * Commands that change a database schema. Matched against the Bash command
 * string; the hook only fires when one of these is present.
 */
export const MIGRATION_PATTERNS = [
  /\bprisma\s+migrate\s+(?:dev|deploy|reset)\b/,
  /\bprisma\s+db\s+push\b/,
  /\bdrizzle-kit\s+(?:push|migrate)\b/,
  /\bknex\s+migrate:(?:latest|up)\b/,
  /\bsequelize(?:-cli)?\s+db:migrate\b/,
  /\btypeorm\s+migration:run\b/,
  /\balembic\s+upgrade\b/,
  /\brails\s+db:migrate\b/,
  /\bartisan\s+migrate\b/,
  /\bgoose\s+up\b/,
  /\batlas\s+schema\s+apply\b/,
];

/** @param {string} command @returns {boolean} */
export function isMigrationCommand(command) {
  return MIGRATION_PATTERNS.some((pattern) => pattern.test(command));
}

/**
 * `git commit` in any of its shapes, including `git -C path commit` and a
 * commit chained after another command.
 *
 * @param {string} command
 * @returns {boolean}
 */
export function isCommitCommand(command) {
  return /(?:^|[;&|]\s*)git\b(?:\s+-{1,2}[^\s]+(?:\s+[^\s-][^\s]*)?)*\s+commit\b/.test(command);
}
