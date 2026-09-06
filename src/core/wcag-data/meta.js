// Auto-split from src/core/wcag-data.js - see ./wcag-data/index.js
/** WCAG version metadata, EARL outcome set, and the EM workflow steps. */
export const WCAG_VERSION = "2.2";

/** Where the data came from, for the report's provenance line. */
export const WCAG_SOURCE = "https://www.w3.org/WAI/WCAG22/wcag.json";

/** When this file was generated, in ISO date form. */
export const WCAG_GENERATED = "2026-08-29";

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
  { step: 5, name: "Report the findings", asks: "Scope, sample, outcomes, and the conformance claim they support" },
];

