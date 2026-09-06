#!/usr/bin/env node
/**
 * @module scripts/update-wcag-data
 *
 * Regenerates `src/core/wcag-data/index.js` from the W3C's published WCAG JSON.
 *
 * The criteria are vendored rather than fetched at runtime for the same reason
 * every other rule output is deterministic: a tool that reaches the network
 * to answer gives a different answer when the network is down, and cannot be
 * cached. WCAG 2.2 is a Recommendation, so the data changes on the order of
 * years - a sync script run deliberately is the right cadence, not a fetch on
 * every call.
 *
 * Network only here. The server itself never calls out.
 *
 * Usage:
 *   node scripts/update-wcag-data.mjs            # report what would change
 *   node scripts/update-wcag-data.mjs --apply    # rewrite the module
 *
 * @see https://www.w3.org/WAI/WCAG22/wcag.json - the source
 * @see https://www.w3.org/TR/WCAG-EM/ - the evaluation methodology the report follows
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SOURCE = "https://www.w3.org/WAI/WCAG22/wcag.json";
const TARGET = fileURLToPath(new URL("../src/core/wcag-data/_criteria.data.js", import.meta.url));
const apply = process.argv.includes("--apply");

/** Flatten the principle/guideline/criterion tree into one keyed record. */
function flatten(document_) {
  const criteria = {};
  for (const principle of document_.principles ?? []) {
    for (const guideline of principle.guidelines ?? []) {
      for (const sc of guideline.successcriteria ?? []) {
        if (!sc.num || !sc.level) {
          continue;
        }
        criteria[sc.num] = {
          num: sc.num,
          id: sc.id,
          handle: sc.handle,
          level: sc.level,
          guideline: `${guideline.num} ${guideline.handle}`,
          principle: `${principle.num} ${principle.handle}`,
        };
      }
    }
  }

  return criteria;
}

/** Render the module. Sorted by criterion number so the diff is readable. */
function render(criteria, generatedOn) {
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

const response = await fetch(SOURCE);
if (!response.ok) {
  console.error(`Could not fetch ${SOURCE}: HTTP ${response.status}`);
  process.exit(1);
}
const criteria = flatten(await response.json());
const count = Object.keys(criteria).length;
if (count < 50) {
  console.error(`Only ${count} criteria parsed - the source shape changed. Refusing to write.`);
  process.exit(1);
}

const generatedOn = new Date().toISOString().slice(0, 10);
const next = render(criteria, generatedOn);

const previous = existsSync(TARGET) ? readFileSync(TARGET, "utf8") : "";
const strip = (text) =>
  text.replaceAll(/^ \* Generated: .*$/gm, "").replaceAll(/^export const WCAG_GENERATED = .*$/gm, "");
const changed = strip(previous) !== strip(next);

const byLevel = Object.values(criteria).reduce(
  (accumulator, c) => ({ ...accumulator, [c.level]: (accumulator[c.level] ?? 0) + 1 }),
  {},
);
console.log(`${count} criteria from ${SOURCE}`);
console.log(`  A: ${byLevel.A ?? 0}   AA: ${byLevel.AA ?? 0}   AAA: ${byLevel.AAA ?? 0}`);

if (!changed) {
  console.log("No change to the vendored criteria.");
} else if (apply) {
  writeFileSync(TARGET, next);
  console.log(`Wrote ${TARGET}`);
} else {
  const before = previous
    ? Object.keys(
        JSON.parse(`{${[...previous.matchAll(/^ {2}"(\d+\.\d+\.\d+)":/gm)].map((m) => `"${m[1]}":0`).join(",")}}`),
      )
    : [];
  const after = Object.keys(criteria);
  const added = after.filter((n) => !before.includes(n));
  const removed = before.filter((n) => !after.includes(n));
  if (added.length > 0) {
    console.log(`  added: ${added.join(", ")}`);
  }
  if (removed.length > 0) {
    console.log(`  removed: ${removed.join(", ")}`);
  }
  console.log("Content differs. Re-run with --apply to write.");
}
