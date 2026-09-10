

/** @module cli/guard/decide - allow, ask, or block one tool call */

import { extname } from "node:path";
import { isCommitCommand, isMigrationCommand } from "../../core/agents/_hooks.js";

/** Silent pass-through: the hook says nothing and the tool call proceeds. */
export const ALLOW = { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "allow" } };

/** @param {string} reason @returns {object} */
export const ask = (reason) => ({
  hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "ask", permissionDecisionReason: reason },
});

const MIGRATION_REASON = [
  "This applies a schema change. Once it runs, removing a column costs a second migration plus the code written on top of it.",
  "Before confirming, state for every new column: who writes it, who reads it, and which existing column already holds that value.",
  "For every new table: name the consumer. For every new index: name the query.",
  "Anything without an answer does not go in this migration (rule_tool_process_simplicity).",
].join(" ");

/** Extensions worth running guardrails on. */
export const CHECKABLE = new Set([".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".vue", ".svelte", ".astro", ".css", ".sql", ".prisma"]);

/**
 * Map a path to the skill whose guardrails apply. Shared guardrails run for
 * every skill, so an imprecise match still checks the rules that matter here.
 *
 * @param {string} path
 * @returns {string}
 */
export function skillForPath(path) {
  const extension = extname(path);

  if (extension === ".sql" || extension === ".prisma") {
    return "rule-data-sql";
  }

  if (extension === ".vue") {
    return "rule-frontend-vue";
  }

  if (extension === ".svelte") {
    return "rule-frontend-svelte";
  }

  if (extension === ".jsx" || extension === ".tsx") {
    return "rule-frontend-react";
  }

  if (extension === ".css") {
    return "rule-styleguide-css";
  }

  return "rule-styleguide-javascript";
}

/**
 * Decide on a Bash command. Pure: the caller supplies the staged-file check so
 * this stays free of git and of the filesystem.
 *
 * @param {string} command - The command the model is about to run
 * @param {"bash"|"migration"|"commit"} [kind] - "bash" (the installed hook) checks both
 * @param {() => Array<{ file: string, failures: string[] }>} [collectFailures]
 * @returns {object} hook output
 */
export function decide(command, kind = "bash", collectFailures = () => []) {
  if (!command) {
    return ALLOW;
  }

  if (kind !== "commit" && isMigrationCommand(command)) {
    return ask(MIGRATION_REASON);
  }

  if (kind === "migration" || !isCommitCommand(command)) {
    return ALLOW;
  }

  const failures = collectFailures();

  if (failures.length === 0) {
    return ALLOW;
  }

  const summary = failures
    .slice(0, 10)
    .map(({ file, failures: ids }) => `- ${file}: ${ids.join(", ")}`)
    .join("\n");

  return ask(`rule guardrails fail on the staged files. Fix them or confirm the commit deliberately.\n${summary}`);
}
