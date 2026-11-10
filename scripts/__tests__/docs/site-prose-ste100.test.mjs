/**
 * Every page the site emits reads in ASD-STE100 at about 80 percent.
 *
 * The subset is the one the server already ships in `core/directive/_ste100.js`
 * (ADR 230) plus the sentence cap of ADR 232: a descriptive sentence stays under
 * 25 words, the punctuation is ASCII, and the banned patterns stay out. The
 * generated chapters count too. Their prose is the tool descriptions and the
 * skill metadata that live in the code, so a long sentence there is fixed at its
 * source and `pnpm census` rewrites the page.
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { scanSte100Prose } from "../../../packages/mcp/core/directive/_ste100.js";
import { collectPages } from "../../../packages/docs/_collect.mjs";

const root = new URL("../../../", import.meta.url).pathname;

/** The chrome the generator writes around the Markdown: nav labels, footer, prefs. */
const CHROME = ["packages/docs/_shell.mjs", "packages/docs/_nav.mjs", "packages/docs/prefs.js"];

/** The sources of every emitted page, each file once. */
function siteSources() {
  const pages = collectPages(root);

  return [...new Set(pages.flatMap((page) => page.sources ?? [page.src]))].sort();
}

/**
 * Prose only: code, tables and headings carry no sentence to measure.
 *
 * @param {string} markdown
 * @returns {Array<{ line: number, text: string }>}
 */
function proseLines(markdown) {
  return markdown
    .replaceAll(/```[\s\S]*?```/gu, (block) => "\n".repeat(block.split("\n").length - 1))
    .replaceAll(/<!--[\s\S]*?-->/gu, "")
    .split("\n")
    .map((line, index) => ({ line: index + 1, text: line }))
    .filter(({ text }) => !/^\s*(?:\||#{1,6}\s|$)/u.test(text))
    .map(({ line, text }) => ({
      line,
      text: text
        .replaceAll(/`[^`]*`/gu, "X")
        .replaceAll(/\[([^\]]*)\]\([^)]*\)/gu, "$1")
        .replace(/^\s*(?:[-*+]|\d+\.)\s+/u, ""),
    }))
    .filter(({ text }) => text.trim() !== "");
}

test("no descriptive sentence on the site runs past 25 words", () => {
  const offenders = [];

  for (const file of siteSources()) {
    for (const { line, text } of proseLines(readFileSync(join(root, file), "utf8"))) {
      for (const sentence of text.split(/(?<=[.!?])\s+/u)) {
        const words = sentence.trim().split(/\s+/u).filter(Boolean);

        if (words.length > 25) {
          offenders.push(`${file}:${line} (${words.length} words) ${words.slice(0, 8).join(" ")}...`);
        }
      }
    }
  }

  assert.deepEqual(offenders, [], "split the sentence, or fix the description in the code and run pnpm census");
});

test("the site keeps ASCII punctuation and avoids the banned STE patterns", () => {
  const offenders = [];

  for (const file of [...siteSources(), ...CHROME]) {
    const text = readFileSync(join(root, file), "utf8");

    for (const finding of scanSte100Prose(text).findings) {
      offenders.push(`${file}: ${finding.id} "${finding.match}"`);
    }

    for (const [index, line] of text.split("\n").entries()) {
      if (/[\u2018\u2019\u201C\u201D]/u.test(line)) {
        offenders.push(`${file}:${index + 1}: curly quote`);
      }
    }
  }

  assert.deepEqual(offenders, [], "STE100~80: ASCII punctuation, no utilize, no stacked hedge");
});
