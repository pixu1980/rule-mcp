/**
 * @module core/history/reword
 *
 * Rewriting commit messages to Conventional Commits.
 *
 * The selection is deterministic - the commits come from the feature range, and
 * only the ones named in `rewrites` are touched. The messages are proposed by
 * whoever calls this (the model, from the audit); this module validates each
 * against the one rule, refuses the whole batch if any is invalid, and applies
 * them with `git filter-branch --msg-filter`, which changes messages and nothing
 * else. The tree before and after must match, or the change is rolled back.
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { lintMessage } from "../commit/index.js";
import { currentBranch, getFeatureCommitRange, git, gitResult, rewriteSafety } from "../git/index.js";
import { rollback, verifyNormalization } from "./_verify.js";

/**
 * The helper `filter-branch` runs per commit: it prints the replacement for
 * `GIT_COMMIT` from the map, or echoes the original message unchanged.
 */
const FILTER = [
  'import { readFileSync } from "node:fs";',
  'const map = JSON.parse(readFileSync(process.argv[2], "utf8"));',
  'let input = "";',
  'process.stdin.setEncoding("utf8");',
  'process.stdin.on("data", (chunk) => {',
  "  input += chunk;",
  "});",
  'process.stdin.on("end", () => {',
  "  process.stdout.write(map[process.env.GIT_COMMIT] ?? input);",
  "});",
  "",
].join("\n");

/**
 * Quote one argument for the shell that runs the msg-filter.
 *
 * @param {string} value
 * @returns {string}
 */
function quote(value) {
  return `'${String(value).replaceAll("'", String.raw`'\''`)}'`;
}

/**
 * One proposed message, judged against the rule and the range.
 *
 * @param {string} projectDir
 * @param {{ rewrites?: Array<{ sha: string, message: string }>, baseBranch?: string }} [options]
 * @returns {{ range: object, entries: object[], invalid: object[] }}
 */
export function proposeReword(projectDir, options = {}) {
  const range = getFeatureCommitRange(projectDir, { baseBranch: options.baseBranch });
  const bySha = new Map((range.commits ?? []).map((commit) => [commit.sha, commit]));
  const entries = (options.rewrites ?? []).map((rewrite) => {
    const commit = bySha.get(rewrite.sha);
    const verdict = lintMessage(rewrite.message);

    return {
      sha: rewrite.sha,
      short: commit?.short ?? rewrite.sha.slice(0, 7),
      from: commit?.subject ?? "(not in the feature range)",
      to: rewrite.message,
      inRange: Boolean(commit),
      valid: verdict.valid,
      reason: verdict.valid ? "" : verdict.reason,
    };
  });

  return { range, entries, invalid: entries.filter((entry) => !entry.valid || !entry.inRange) };
}

/**
 * Apply the reword, after confirmation, a safety check and validation.
 *
 * @param {string} projectDir
 * @param {{ rewrites?: Array<{ sha: string, message: string }>, baseBranch?: string, confirm?: boolean }} [options]
 * @returns {object}
 */
export function applyReword(projectDir, options = {}) {
  const proposal = proposeReword(projectDir, options);

  if (!options.confirm) {
    return { applied: false, reason: "confirmation required", proposal };
  }

  if (proposal.entries.length === 0) {
    return { applied: false, reason: "no rewrites requested", proposal };
  }

  if (proposal.invalid.length > 0) {
    return { applied: false, reason: `${proposal.invalid.length} rewrite(s) are invalid or outside the feature range`, proposal };
  }

  if (!currentBranch(projectDir)) {
    return { applied: false, reason: "detached HEAD: check out the feature branch first", proposal };
  }

  const safety = rewriteSafety(projectDir);

  if (!safety.safe) {
    return { applied: false, reason: `working tree not safe to rewrite: ${safety.reasons.join("; ")}`, proposal };
  }

  const original = git(projectDir, ["rev-parse", "HEAD"]);
  const beforeTree = git(projectDir, ["rev-parse", "HEAD^{tree}"]);
  const directory = mkdtempSync(join(tmpdir(), "rule-mcp-reword-"));

  try {
    const script = join(directory, "filter.mjs");
    const map = join(directory, "map.json");

    writeFileSync(script, FILTER);
    writeFileSync(map, JSON.stringify(Object.fromEntries(proposal.entries.map((entry) => [entry.sha, entry.to]))));

    const command = `${quote(process.execPath)} ${quote(script)} ${quote(map)}`;
    const result = gitResult(projectDir, ["filter-branch", "-f", "--msg-filter", command, "--", `${proposal.range.mergeBase}..HEAD`], {
      env: { ...process.env, FILTER_BRANCH_SQUELCH_WARNING: "1" },
      timeout: 120_000,
    });
    const verification = verifyNormalization(projectDir, { beforeTree, baseBranch: options.baseBranch });

    if (!result.ok || !verification.treeUnchanged) {
      rollback(projectDir, original);

      return {
        applied: false,
        reason: result.ok ? "the rewrite changed the final tree; it was rolled back" : "filter-branch stopped; the branch was rolled back",
        output: result.stdout,
        proposal,
      };
    }

    return { applied: true, verification, proposal };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
