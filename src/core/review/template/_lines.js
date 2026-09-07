/** @module core/review/template/lines */

/**
 * The template, exactly as written, with the operation-specific clause filled.
 * Placeholders are replaced, nothing else is invented.
 */
export function templateLines(operation) {
  const action =
    operation === "audit"
      ? "and run an audit of the project to surface bugs, rework, and whatever else needs doing"
      : operation === "review"
        ? "and review the project to surface bugs, rework, and whatever else needs doing"
        : "and build a bugfix/rework plan of everything it takes to put this project in its best possible shape";

  const output =
    operation === "audit"
      ? ["the output of this run must be the evidence collected, without opinions,", "in markdown, in the ./docs/audits folder"]
      : operation === "review"
        ? ["the output of this run must be the list of findings,", "in markdown, in the ./docs/reviews folder"]
        : ["the output of this run must be a plan with roadmaps organized into steps and dependencies,", "in markdown, in the ./docs/plans folder"];

  return [
    "Act as a {{ROLE}} with more than {{YEARS_OF_EXPERIENCE}} years of experience,",
    "specializing in {{SKILLS}}",
    action,
    "so the run is above reproach across the very areas those skills cover.",
    "Search the web or look for recent articles to find anything else this repo could do better.",
    "",
    "If needed, switch to interview mode to untangle any open point.",
    "",
    ...output,
    "",
    `The rest of the operating contract for \`${operation}\` is below: follow it.`,
  ].join("\n");
}
