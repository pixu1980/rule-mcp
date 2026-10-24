/** @module scripts/data/wcag/render - the generated _criteria.data.js source text */

/** Render the module. Sorted by criterion number so the diff is readable. */
export function render(criteria, generatedOn) {
  const entries = Object.values(criteria)
    .sort((a, b) => a.num.localeCompare(b.num, undefined, { numeric: true }))
    .map((c) => `  "${c.num}": ${JSON.stringify(c)},`)
    .join("\n");

  return `/**
 * @module core/wcag-data/criteria
 *
 * WCAG 2.2 success criteria, vendored. Data file: exempt from the size cap.
 *
 * GENERATED FILE - do not edit by hand.
 * Regenerate with \`node scripts/update-wcag-data.mjs --apply\`, or
 * \`rule-mcp a11y-update\`.
 *
 * Source: ${SOURCE}
 * Generated: ${generatedOn}
 *
 * Vendored rather than fetched so every a11y answer is deterministic and
 * cacheable, and so the server never needs the network to produce one.
 *
 * @see module:tools/a11y - the report built from these
 */

/** The WCAG version these criteria come from. */
export const WCAG_VERSION = "2.2";

/** Where the data came from, for the report's provenance line. */
export const WCAG_SOURCE = "${SOURCE}";

/** When this file was generated, in ISO date form. */
export const WCAG_GENERATED = "${generatedOn}";

/**
 * EARL outcomes, the vocabulary a WCAG-EM report records results in.
 *
 * @see https://www.w3.org/TR/EARL10-Schema/
 */
export const EARL_OUTCOMES = ["passed", "failed", "cantTell", "inapplicable", "untested"];

/**
 * The five steps of the WCAG Evaluation Methodology. A report that skips one is
 * not a WCAG-EM report - most usefully, a result with no declared scope and no
 * declared sample cannot be reproduced or disputed.
 *
 * @see https://www.w3.org/TR/WCAG-EM/
 */
export const WCAG_EM_STEPS = [
  {
    step: 1,
    name: "Define the evaluation scope",
    asks: "Which pages, which conformance target, which technologies and user agents",
  },
  {
    step: 2,
    name: "Explore the target",
    asks: "Common pages, functionality, types of content, technologies relied upon",
  },
  {
    step: 3,
    name: "Select a representative sample",
    asks: "Structured sample plus a random sample; record why each page is in it",
  },
  {
    step: 4,
    name: "Audit the selected sample",
    asks: "One outcome per criterion per page, with the evidence that produced it",
  },
  {
    step: 5,
    name: "Report the findings",
    asks: "Scope, sample, outcomes, and the conformance claim they support",
  },
];

/** Every success criterion, keyed by number. */
export const CRITERIA = {
${entries}
};
`;
}
