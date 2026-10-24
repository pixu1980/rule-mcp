/**
 * @module core/commit/lint
 *
 * Applying the rule to actual commits: a message file, a revision range, or an
 * explicit sha list.
 *
 * Git supplies the commit set and this module never asks a model which commits
 * are in it; the model's opinion is only ever wanted for *proposing* a corrected
 * message, never for deciding what is in range.
 */

import { listCommits, listCommitsByShas } from "../git/index.js";
import { explainViolation, isSystemSubject, parseCommitMessage } from "./_rule.js";

/**
 * The full message of a commit record, so a `BREAKING CHANGE:` footer is read.
 *
 * @param {{ subject: string, body: string }} commit
 * @returns {string}
 */
function messageOf(commit) {
  return commit.body ? `${commit.subject}\n\n${commit.body}` : commit.subject;
}

/**
 * @typedef {object} MessageVerdict
 * @property {boolean} valid
 * @property {boolean} exempt system-generated, so exempt from the scope rule
 * @property {string} subject
 * @property {string} reason "" when valid
 */

/**
 * Validate one commit message.
 *
 * @param {string} text
 * @returns {MessageVerdict}
 */
export function lintMessage(text) {
  const parsed = parseCommitMessage(text);

  if (isSystemSubject(parsed.subject)) {
    return { valid: true, exempt: true, subject: parsed.subject, reason: "" };
  }

  return {
    valid: parsed.valid,
    exempt: false,
    subject: parsed.subject,
    reason: parsed.valid ? "" : explainViolation(parsed.subject),
  };
}

/**
 * @typedef {object} Violation
 * @property {string} sha
 * @property {string} short
 * @property {string} subject
 * @property {string} reason
 */

/**
 * Validate a list of commit records.
 *
 * @param {import("../git/index.js").CommitRecord[]} commits
 * @returns {{ linted: number, violations: Violation[] }} `linted` excludes the
 *   system-generated commits that were skipped
 */
export function lintCommits(commits) {
  const violations = [];
  let linted = 0;

  for (const commit of commits) {
    const verdict = lintMessage(messageOf(commit));

    if (verdict.exempt) {
      continue;
    }

    linted += 1;

    if (!verdict.valid) {
      violations.push({ sha: commit.sha, short: commit.short, subject: commit.subject, reason: verdict.reason });
    }
  }

  return { linted, violations };
}

/**
 * Validate every commit in a revision range.
 *
 * @param {string} projectDir
 * @param {string} range
 * @returns {{ linted: number, violations: Violation[] }}
 */
export function lintRange(projectDir, range) {
  return lintCommits(listCommits(projectDir, range));
}

/**
 * Validate every commit in an explicit sha list.
 *
 * @param {string} projectDir
 * @param {string[]} shas
 * @returns {{ linted: number, violations: Violation[] }}
 */
export function lintShas(projectDir, shas) {
  return lintCommits(listCommitsByShas(projectDir, shas));
}

/**
 * The report lines a gate prints for a failed lint: the sha, the message and
 * the reason, one commit per block.
 *
 * @param {Violation[]} violations
 * @returns {string[]}
 */
export function renderViolations(violations) {
  return violations.flatMap((violation) => [`commit-lint: ${violation.short} ${violation.subject}`, `  ${violation.reason}`]);
}
