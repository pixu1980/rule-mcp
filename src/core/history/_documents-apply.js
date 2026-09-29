

/**
 * @module core/history/documents-apply
 *
 * Writing the merged ADR and handoff, and rebuilding the two indexes.
 *
 * The merge is a concatenation on purpose: a header, then every original
 * reproduced verbatim under an `<!-- source: ... -->` marker. Nothing is
 * summarized, so no decision can be lost to a rewrite, and the result is a
 * function of the files rather than of a model.
 */

import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { ADR_DIR, buildAdrIndex, listExistingAdrs } from "../../tools/adr/index.js";
import { buildHandoffIndex, listExistingHandoffs } from "../../tools/handoff/_handoff-index.js";
import { HANDOFF_DIR } from "./_documents.js";

const ADR_INDEX = "ADR.md";
const HANDOFF_INDEX = "HANDOFF.md";

/** One source document, verbatim, with a marker naming where it came from. */
function sourceBlock(projectDir, file) {
  const body = readFileSync(join(projectDir, file), "utf8").trimEnd();

  return ["---", "", `<!-- source: ${file} -->`, "", body, ""];
}

/** The merged ADR: one header, then every original verbatim, in order. */
export function mergedAdrText(projectDir, plan) {
  const numbers = plan.adrs.map((file) => file.split("/").pop().slice(0, 3));
  const lines = [
    `# ${numbers[0]}: ${plan.slug.replaceAll("-", " ")}`,
    "",
    `_Consolidated at the feature close from ${plan.adrs.length} decisions of this feature (${numbers.join(", ")}). Each decision is reproduced in full below._`,
    "",
  ];

  for (const file of plan.adrs) {
    lines.push(...sourceBlock(projectDir, file));
  }

  return `${lines.join("\n").replace(/\n+$/u, "")}\n`;
}

/** The merged handoff: one header, then every session verbatim, in order. */
export function mergedHandoffText(projectDir, plan) {
  const first = readFileSync(join(projectDir, plan.handoffs[0]), "utf8");
  const label = plan.handoffs[0].split("/").pop().slice(0, plan.handoffs[0].split("/").pop().indexOf("-"));
  const branch =
    first
      .match(/^.*\bbranch\b.*$/imu)?.[0]
      ?.replaceAll(/[`*]/gu, "")
      .trim() ?? `- **Branch**: \`${plan.slug}\``;
  const date = first.match(/\d{4}-\d{2}-\d{2}/u)?.[0] ?? "";
  const lines = [
    `# Session handoff ${label} - ${plan.slug}`,
    "",
    branch,
    `- **Date**: ${date}`,
    "",
    `_Consolidated at the feature close from ${plan.handoffs.length} session handoffs of this feature. Each is reproduced in full below._`,
    "",
  ];

  for (const file of plan.handoffs) {
    lines.push(...sourceBlock(projectDir, file));
  }

  return `${lines.join("\n").replace(/\n+$/u, "")}\n`;
}

/** Write a file only when its content would change. */
function writeIfChanged(path, content) {
  let current = "";

  try {
    current = readFileSync(path, "utf8");
  } catch {
    // No file yet, so anything is a change.
  }

  if (current === content) {
    return false;
  }

  writeFileSync(path, content);

  return true;
}

/**
 * Rebuild `docs/adr/ADR.md` and `docs/handoff/HANDOFF.md` from the files on disk.
 *
 * @param {string} projectDir
 * @returns {string[]} the index paths that changed
 */
export function rebuildIndexes(projectDir) {
  const changed = [];
  const adrDir = join(projectDir, ADR_DIR);

  if (existsSync(adrDir) && writeIfChanged(join(adrDir, ADR_INDEX), buildAdrIndex(listExistingAdrs(adrDir)))) {
    changed.push(`${ADR_DIR}/${ADR_INDEX}`);
  }

  const handoffDir = join(projectDir, HANDOFF_DIR);

  if (existsSync(handoffDir) && writeIfChanged(join(handoffDir, HANDOFF_INDEX), buildHandoffIndex(listExistingHandoffs(handoffDir)))) {
    changed.push(`${HANDOFF_DIR}/${HANDOFF_INDEX}`);
  }

  return changed;
}

/**
 * Apply a plan: write the merged documents, delete the originals, rebuild the indexes.
 *
 * @param {string} projectDir
 * @param {object} plan - from planConsolidation
 * @returns {{ written: string[], deleted: string[], indexes: string[], paths: string[] }}
 */
export function applyConsolidation(projectDir, plan) {
  const written = [];
  const deleted = [];

  for (const [kind, target] of [
    ["adrs", plan.adrTarget],
    ["handoffs", plan.handoffTarget],
  ]) {
    if (!target) {
      continue;
    }

    writeFileSync(join(projectDir, target), kind === "adrs" ? mergedAdrText(projectDir, plan) : mergedHandoffText(projectDir, plan));
    written.push(target);

    for (const file of plan[kind]) {
      if (file === target) {
        continue;
      }

      rmSync(join(projectDir, file), { force: true });
      deleted.push(file);
    }
  }

  const indexes = rebuildIndexes(projectDir);

  return { written, deleted, indexes, paths: [...new Set([...written, ...deleted, ...indexes])] };
}
