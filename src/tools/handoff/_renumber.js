

/**
 * @module tools/handoff/renumber
 *
 * The automatic half of `handoff doctor`: a close-session handoff plans the
 * ADR and handoff renumbering and applies it, so a merged branch does not ship
 * a duplicate number and a stale index just because nobody ran the doctor.
 *
 * A plain handoff never mutates: it is the diagnostic, and the doctor remains
 * the explicit dry run.
 */

import { applyRenumber, planRenumber } from "../../core/docs-numbering/index.js";

/**
 * Plan the renumbering, and apply it when asked.
 *
 * @param {string} [projectDir]
 * @param {{ apply?: boolean, onProgress?: Function }} [options]
 * @returns {{ needed: boolean, plan: object, applied: object|null }}
 */
export function autoRenumber(projectDir = ".", { apply = false, onProgress } = {}) {
  const plan = planRenumber({ projectDir, onProgress });
  const authors = plan.authors?.length ?? 0;
  const needed = plan.renames.length > 0 || plan.indexUnordered || plan.indexStale || plan.handoffIndexUnordered || plan.handoffIndexStale || authors > 0;

  if (!needed) {
    return { needed: false, plan, applied: null };
  }

  if (!apply) {
    return { needed: true, plan, applied: null };
  }

  return { needed: true, plan, applied: applyRenumber(plan, { projectDir, onProgress }) };
}

/**
 * The handoff section naming what the renumber changed, or what it would.
 *
 * @param {{ needed: boolean, plan: object, applied: object|null }|null} renumber
 * @param {{ isMinimal: boolean }} shape
 * @returns {string[]}
 */
export function renumberLines(renumber, { isMinimal }) {
  if (!renumber || !renumber.needed || isMinimal) {
    return [];
  }

  if (!renumber.applied) {
    return ["### Renumber pending", "", `${renumber.plan.renames.length} collision(s) wait for a close-session run.`, ""];
  }

  const regenerated = [renumber.applied.indexRegenerated ? "ADR.md" : undefined, renumber.applied.handoffIndexRegenerated ? "HANDOFF.md" : undefined].filter(Boolean);

  return [
    "### Renumber",
    "",
    `Renumbered ${renumber.applied.renamed} document(s); ${renumber.applied.referencesUpdated} file(s) had references updated${regenerated.length > 0 ? `; ${regenerated.join(" and ")} regenerated` : ""}.`,
    "Commit messages are not rewritten; run `rule-mcp handoff doctor --fix-commits` to amend the local ones.",
    "",
  ];
}
