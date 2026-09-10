

/** @module core/agents/hook-commands - the marker and the command classifiers */

/** Marks our entries so merge and uninstall can find them without touching others. */
export const HOOK_MARKER = "rule-mcp-guard";

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
