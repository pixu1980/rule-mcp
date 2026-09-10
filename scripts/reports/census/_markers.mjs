/**
 * @module scripts/reports/census/_markers
 *
 * The three blocks the census refreshes inside documents a person writes.
 *
 * A whole generated file can be replaced; a chapter cannot, because the prose
 * around the block is the reason the chapter exists. So these carry an
 * HTML-comment fence, and everything between it is the generator's.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { documentedEnvVars, envVarsInCode } from "./_env-scan.mjs";
import { table } from "./_format.mjs";
import { DOCS } from "./_registries.mjs";
import { commandSurfaceBlock } from "./_sections-commands.mjs";
import { summarySection } from "./_sections-surface.mjs";

const begin = (marker) => `<!-- census:begin:${marker} -->`;
const end = (marker) => `<!-- census:end:${marker} -->`;

/**
 * Replace the fenced block, or append one when the document has no fence yet.
 *
 * @param {string} text - the current document
 * @param {string} marker - the fence name
 * @param {string[]} content - the block body
 * @returns {string} the next document
 */
export function upsertBlock(text, marker, content) {
  const block = [begin(marker), ...content, end(marker)].join("\n");
  const from = text.indexOf(begin(marker));
  const to = text.indexOf(end(marker));

  if (from !== -1 && to > from) {
    return text.slice(0, from) + block + text.slice(to + end(marker).length);
  }

  return `${text.replace(/\s*$/, "")}\n\n${block}\n`;
}

/** The counted surface, in the chapter that describes how the server is built. */
function surfaceCounts(data) {
  return [
    "",
    ...summarySection(data),
    "Regenerate with `pnpm census`. The inventories themselves are",
    "[`08-skills.md`](08-skills.md) through [`15-resources.md`](15-resources.md).",
    "",
  ];
}

/**
 * The variables the code reads, in the chapter that documents what each one
 * does. The table above the block carries the descriptions and defaults; this
 * block carries where the value is read and whether the two agree.
 */
function envRegistry() {
  const readers = envVarsInCode();
  const documented = documentedEnvVars(readFileSync(join(DOCS, "05-env-variables.md"), "utf8"), "env-registry");
  const undocumented = [...readers.keys()].filter((name) => !documented.has(name));
  const unread = [...documented].filter((name) => !readers.has(name));
  const names = (list) => list.map((name) => `\`${name}\``).join(", ");

  return [
    "",
    "## Where each variable is read",
    "",
    "Generated from `src/` and `bin/`: the modules that name the variable, so a",
    "knob documented above can be traced to the code that answers it.",
    "",
    ...table(
      ["Variable", "Read in"],
      [...readers.entries()].map(([name, paths]) => [`\`${name}\``, paths.map((path) => `\`${path}\``).join(", ")]),
    ),
    "",
    `${readers.size} read by the code, ${documented.size} documented in the table above.`,
    "",
    // Both directions are a disagreement worth naming. A knob the code reads and
    // nobody documented is undiscoverable; a knob the table promises and nothing
    // reads is a behavior the reader will look for and not find.
    undocumented.length > 0 ? `Read but undocumented: ${names(undocumented)}.` : "Nothing the code reads is undocumented.",
    "",
    unread.length > 0 ? `Documented but read nowhere in \`src/\` or \`bin/\`: ${names(unread)}.` : "Nothing documented goes unread.",
    "",
    "Regenerate with `pnpm census`.",
    "",
  ];
}

/** One entry per fenced block: which document, which fence, what goes in it. */
export const MARKER_TARGETS = [
  { file: "02-product-architecture.md", marker: "surface-counts", build: (data) => surfaceCounts(data) },
  { file: "07-engineering-guides.md", marker: "command-surface", build: (data) => commandSurfaceBlock(data) },
  { file: "05-env-variables.md", marker: "env-registry", build: () => envRegistry() },
];
