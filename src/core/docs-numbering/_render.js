import { staleCommitReferences } from "./_stale-commits.js";

/**
 * A human-readable report of a plan.
 *
 * @param {{ collisions: object[], gaps: object[], renames: object[] }} plan
 * @returns {string}
 */
export function renderRenumberPlan(plan, options = {}) {
  // The report is rendered before the repair runs, so telling a caller that
  // already passed --fix to run with --fix is noise it cannot act on.
  const willFix = options.fix === true;

  const authors = plan.authors ?? [];
  const gaps = plan.gaps ?? [];
  // A hole collides with nothing, so a report that only counts collisions
  // calls a gapped tree clean. Naming the missing numbers is what makes the
  // report answer the question a reader actually has.
  const gapLines = gaps.length === 0 ? [] : [`${gaps.length} number(s) missing from the sequence:`, "", ...gaps.map((gap) => `- ${gap.family} ${gap.number}`)];
  const authorLines =
    authors.length === 0
      ? []
      : [
          `${authors.length} ADR(s) name a tool or nobody as their author:`,
          "",
          ...authors.map((entry) => `- ${entry.file}: ${entry.current || "no author line"} -> ${entry.author}`),
          ...(willFix ? [] : ["", "Run with --fix to name the person the commit says added each file."]),
        ];

  if (plan.renames.length === 0 && !plan.indexUnordered) {
    const clean = "Numbering is clean: no duplicate ADR or handoff numbers, no gaps, and the ADR index is in order.";

    return authors.length === 0 ? clean : [clean, "", ...authorLines].join("\n");
  }

  if (plan.renames.length === 0) {
    return [
      "No duplicate numbers, but the ADR index (docs/adr/ADR.md) is out of order:",
      "a row sits above one with a higher number, which appends do and the generator does not.",
      ...(willFix ? [] : ["", "Run with --fix to regenerate it."]),
      ...(authorLines.length > 0 ? ["", ...authorLines] : []),
    ].join("\n");
  }

  // The gap clause only appears when there are gaps: "0 gap(s)" in the header
  // of every collision report is noise, and a reader scanning for the count
  // they came for should find it where it has always been.
  const counted = gaps.length > 0 ? `${plan.collisions.length} collision(s) and ${gaps.length} gap(s)` : `${plan.collisions.length} collision(s)`;
  const lines = [`${counted} found:`, ""];

  if (gapLines.length > 0) {
    lines.push(...gapLines, "");
  }

  if (authorLines.length > 0) {
    lines.push(...authorLines, "");
  }

  for (const rename of plan.renames) {
    lines.push(`- ${rename.family} ${rename.from} -> ${rename.to}`);
  }

  if (!willFix) {
    lines.push("", "Run with --fix to apply. References in docs/ are updated with the move.");
  }

  // A message that names a moved document still points at a number now held by
  // a different one. The repair cannot fix that without rewriting history, so it
  // says which commits are affected and leaves the decision where it belongs.
  const stale = staleCommitReferences(plan, { projectDir: plan.projectDir });

  if (stale.length > 0) {
    const certain = stale.filter((entry) => entry.match === "path");
    const ambiguous = stale.filter((entry) => entry.match === "number");

    lines.push("", `${stale.length} commit message(s) touch a document that moves. Git history is not rewritten.`);

    if (certain.length > 0) {
      lines.push(
        "",
        "Naming the moved file, so certainly stale:",
        "",
        ...certain.map((entry) => `- ${entry.sha} ${entry.subject} (${entry.file} -> ${entry.family} ${entry.toNumber})`),
      );
    }

    if (ambiguous.length > 0) {
      lines.push(
        "",
        "Naming the number only. Two documents held it, which is why this repair exists, so which one each",
        "message meant is not knowable from the message:",
        "",
        ...ambiguous.map((entry) => `- ${entry.sha} ${entry.subject} (${entry.family} ${entry.fromNumber})`),
      );
    }

    lines.push("", "Amend them while they are local, or leave them and let the document headers carry the truth.");
  }

  return lines.join("\n");
}
