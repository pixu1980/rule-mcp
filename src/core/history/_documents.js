

/**
 * @module core/history/documents
 *
 * Which ADRs and handoffs belong to the feature being closed.
 *
 * Three deterministic signals, unioned - never a model's reading:
 *
 *   1. a commit in `merge-base..HEAD` that touched `docs/adr` or `docs/handoff`;
 *   2. a document cited by a commit message in the range, or by a handoff in it;
 *   3. a document whose filename carries the branch slug.
 *
 * A document matched only by 2 or 3 is committed outside the range: it is
 * reported as outside and never touched, so a shared decision cannot be pulled
 * out from under another feature.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { ADR_DIR, slugify } from "../../tools/adr/index.js";
import { currentBranch, getFeatureCommitRange, gitLines } from "../git/index.js";
import { numberedFilenames, references } from "./_documents-refs.js";

/** The handoff tree. */
export const HANDOFF_DIR = "docs/handoff";

const ADR_FILE = /^\d{3}-.+\.md$/u;
const HANDOFF_FILE = /^\d{2,4}-.+\.md$/u;

/**
 * The feature's slug, from the checked-out branch: `feat/git-workflow` -> `git-workflow`.
 *
 * @param {string} projectDir
 * @returns {string} "" on a detached HEAD or a branch with no usable tail
 */
export function featureSlug(projectDir) {
  const branch = currentBranch(projectDir);

  if (!branch) {
    return "";
  }

  return slugify(branch.includes("/") ? branch.slice(branch.indexOf("/") + 1) : branch);
}

/**
 * Is this path a numbered ADR or handoff document? The index files are not.
 *
 * @param {string} file
 * @returns {boolean}
 */
export function isFeatureDocument(file) {
  return (
    (file.startsWith(`${ADR_DIR}/`) && ADR_FILE.test(file.slice(ADR_DIR.length + 1))) ||
    (file.startsWith(`${HANDOFF_DIR}/`) && HANDOFF_FILE.test(file.slice(HANDOFF_DIR.length + 1)))
  );
}

/**
 * @typedef {object} FeatureDocuments
 * @property {import("../git/index.js").FeatureRange} range
 * @property {string} slug
 * @property {string[]} adrs in-range documents, by path
 * @property {string[]} handoffs in-range documents, by path
 * @property {string[]} outside documents matched but committed outside the range
 */

/**
 * The feature's own documents, in range and outside it.
 *
 * @param {string} projectDir
 * @param {{ baseBranch?: string, slug?: string }} [options]
 * @returns {FeatureDocuments}
 */
export function collectFeatureDocuments(projectDir, options = {}) {
  const range = getFeatureCommitRange(projectDir, { baseBranch: options.baseBranch });
  const slug = options.slug ?? featureSlug(projectDir);

  if (!range.range) {
    return { range, slug, adrs: [], handoffs: [], outside: [] };
  }

  const changed = gitLines(projectDir, ["diff", "--name-only", range.range]).filter((file) => isFeatureDocument(file) && existsSync(join(projectDir, file)));

  const texts = (range.commits ?? []).map((commit) => `${commit.subject}\n${commit.body}`);
  const handoffsInRange = changed.filter((path) => path.startsWith(`${HANDOFF_DIR}/`));

  for (const file of handoffsInRange) {
    try {
      texts.push(readFileSync(join(projectDir, file), "utf8"));
    } catch {
      // An unreadable handoff simply contributes no citations.
    }
  }

  const adrPaths = numberedFilenames(projectDir, ADR_DIR, ADR_FILE).map((name) => `${ADR_DIR}/${name}`);
  const cited = new Set();

  for (const text of texts) {
    for (const reference of references(text, adrPaths)) {
      cited.add(reference);
    }
  }

  const named = [
    ...numberedFilenames(projectDir, ADR_DIR, ADR_FILE).map((name) => `${ADR_DIR}/${name}`),
    ...numberedFilenames(projectDir, HANDOFF_DIR, HANDOFF_FILE).map((name) => `${HANDOFF_DIR}/${name}`),
  ].filter((file) => slug && file.toLowerCase().includes(slug));

  const inside = new Set(changed);
  const outside = [...new Set([...cited, ...named])].filter((file) => !inside.has(file) && existsSync(join(projectDir, file))).sort();
  const pick = (dir, pattern) => [...inside].filter((file) => file.startsWith(`${dir}/`) && pattern.test(file.slice(dir.length + 1))).sort();

  return { range, slug, adrs: pick(ADR_DIR, ADR_FILE), handoffs: pick(HANDOFF_DIR, HANDOFF_FILE), outside };
}
