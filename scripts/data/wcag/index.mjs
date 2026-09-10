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

import { flatten } from "./_flatten.mjs";
import { render } from "./_render.mjs";

const SOURCE = "https://www.w3.org/WAI/WCAG22/wcag.json";
const TARGET = fileURLToPath(new URL("../../../src/core/wcag-data/_criteria.data.js", import.meta.url));
const apply = process.argv.includes("--apply");

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
const strip = (text) => text.replaceAll(/^ \* Generated: .*$/gm, "").replaceAll(/^export const WCAG_GENERATED = .*$/gm, "");
const changed = strip(previous) !== strip(next);

const byLevel = Object.values(criteria).reduce((accumulator, c) => ({ ...accumulator, [c.level]: (accumulator[c.level] ?? 0) + 1 }), {});
console.log(`${count} criteria from ${SOURCE}`);
console.log(`  A: ${byLevel.A ?? 0}   AA: ${byLevel.AA ?? 0}   AAA: ${byLevel.AAA ?? 0}`);

if (!changed) {
  console.log("No change to the vendored criteria.");
} else if (apply) {
  writeFileSync(TARGET, next);
  console.log(`Wrote ${TARGET}`);
} else {
  const before = previous ? Object.keys(JSON.parse(`{${[...previous.matchAll(/^ {2}"(\d+\.\d+\.\d+)":/gm)].map((m) => `"${m[1]}":0`).join(",")}}`)) : [];
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
