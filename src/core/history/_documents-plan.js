/**
 * @module core/history/documents-plan
 *
 * Which documents would be merged into what, read-only. The merged files
 * keep the lowest retired number and the branch slug, so one of the numbers
 * an existing reference may name keeps resolving.
 */

import { ADR_DIR } from "../../tools/adr/index.js";
import { HANDOFF_DIR, collectFeatureDocuments } from "./_documents.js";

/**
 * The consolidation plan: what would be merged into what, read-only.
 *
 * @param {string} projectDir
 * @param {{ baseBranch?: string, slug?: string }} [options]
 * @returns {FeatureDocuments & { consolidates: { adrs: boolean, handoffs: boolean }, adrTarget: string|null, handoffTarget: string|null, actionable: boolean }}
 */
export function planConsolidation(projectDir, options = {}) {
  const documents = collectFeatureDocuments(projectDir, options);
  const adrNumbers = documents.adrs.map((file) => Number.parseInt(file.split("/").pop(), 10));
  const handoffNumbers = documents.handoffs.map((file) => Number.parseInt(file.split("/").pop(), 10));
  const handoffWidth = handoffNumbers.some((number) => number >= 100) ? 3 : 2;
  const consolidates = { adrs: documents.adrs.length > 1, handoffs: documents.handoffs.length > 1 };

  return {
    ...documents,
    consolidates,
    adrTarget: consolidates.adrs ? `${ADR_DIR}/${String(Math.min(...adrNumbers)).padStart(3, "0")}-${documents.slug}.md` : null,
    handoffTarget: consolidates.handoffs ? `${HANDOFF_DIR}/${String(Math.min(...handoffNumbers)).padStart(handoffWidth, "0")}-${documents.slug}.md` : null,
    actionable: consolidates.adrs || consolidates.handoffs,
  };
}
