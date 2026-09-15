

/**
 * @module core/tokensave/changes
 *
 * The semantic view of the working tree a handoff cites: what the uncommitted
 * change says, which symbols it touched, what it impacts, and which tests it
 * reaches.
 *
 * It complements the raw `git diff` the handoff already prints; it never
 * replaces it, because the raw diff is the audit trail and this is the summary.
 *
 * @see module:core/tokensave/client-sync - the synchronous CLI call
 */

import { callToolSync } from "./_client-sync.js";
import { probeFilesystem } from "./_probe.js";

/** Most files one `diff_context` call covers. */
const MAX_CONTEXT_FILES = 50;

/** Whether the commit_context payload carries a real summary. */
function hasCommit(value) {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (typeof value.message === "string" && value.message.trim() !== "" && !/^no changes detected/i.test(value.message)) {
    return true;
  }

  return (value.changed_files?.length ?? 0) > 0 || Object.keys(value.symbols_by_role ?? {}).length > 0;
}

/** Whether the diff_context payload names a changed file or symbol. */
function hasDiff(value) {
  return Boolean(value && ((value.changed_files?.length ?? 0) > 0 || (value.modified_symbols?.length ?? 0) > 0));
}

/**
 * The semantic changes, or null when the graph is absent or there is nothing
 * to report.
 *
 * @param {string} [projectDir] - Project root
 * @param {{ files?: string[], probe?: Function, client?: Function }} [options]
 * @returns {{ commit: object|null, diff: object|null }|null}
 */
export function graphChanges(projectDir = process.cwd(), { files = [], probe = probeFilesystem, client = callToolSync } = {}) {
  if (!probe(projectDir).available) {
    return null;
  }

  const commit = client("commit_context", {}, { projectDir });
  const diff = files.length > 0 ? client("diff_context", { files: files.slice(0, MAX_CONTEXT_FILES), depth: 2 }, { projectDir }) : null;

  if (!commit.ok || !hasCommit(commit.value)) {
    return null;
  }

  const diffValue = diff?.ok && hasDiff(diff.value) ? diff.value : null;
  const symbol = diffValue?.modified_symbols?.find((entry) => ["function", "method", "class", "struct", "enum", "trait", "interface"].includes(entry.kind))?.name;
  let history = null;

  if (symbol) {
    const log = client("log", { symbol, limit: 5 }, { projectDir });

    if (log.ok && (log.value?.events?.length ?? 0) > 0) {
      history = { symbol, events: log.value.events.slice(0, 5) };
    }
  }

  return { commit: commit.value, diff: diffValue, history };
}
