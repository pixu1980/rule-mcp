#!/usr/bin/env node


/**
 * @module scripts/reports/compression
 *
 * What each compression level actually saves, on the corpus this server
 * actually emits.
 *
 * The compression skill claims ~75%; the deterministic port measured 0.5-2.2% on
 * real payloads. Both numbers can be true - the skill compresses an assistant
 * answer written for a human, the server compresses skill bodies that are
 * mostly code fences, tables and headings, all of which are protected by
 * construction. This script is the only place either number comes from, so a
 * level table and the code behind it cannot drift silently.
 *
 * Usage:
 *   node scripts/reports/compression/index.mjs           # report
 *   node scripts/reports/compression/index.mjs --json    # machine-readable
 *
 * @see src/core/text/__tests__/_efficacy.test.mjs - the CI floors
 * @see skills/rule-mcp-process-compression/SKILL.md - the rules this ports
 */

process.env.RULE_MCP_NO_TELEMETRY ??= "1";
process.env.RULE_MCP_NO_AUTOUPDATE ??= "1";
process.env.RULE_MCP_NO_CACHE ??= "1";

import { join } from "node:path";

import { corpora } from "./_corpora.mjs";

const ROOT = new URL("../../..", import.meta.url).pathname;

const { compressTextGuarded } = await import(join(ROOT, "src/core/text/_compression.js"));
const { LEVELS } = await import(join(ROOT, "src/core/text/_level.js"));
const { guardCompression } = await import(join(ROOT, "src/core/text/compress-guard/index.js"));

/** The char/4 heuristic used everywhere in this project. */
const tokens = (text) => Math.ceil(text.length / 4);

/**
 * Measure one corpus at every level.
 *
 * @param {Array<{ name: string, text: string }>} corpus
 * @returns {object}
 */
function measure(corpus) {
  const charsIn = corpus.reduce((sum, item) => sum + item.text.length, 0);
  const tokensIn = corpus.reduce((sum, item) => sum + tokens(item.text), 0);

  const levels = LEVELS.filter((level) => level !== "off").map((level) => {
    let charsOut = 0;
    let tokensOut = 0;
    let rollbacks = 0;
    let violations = 0;
    const worst = [];

    for (const item of corpus) {
      const compressed = compressTextGuarded(item.text, { level });
      charsOut += compressed.text.length;
      tokensOut += tokens(compressed.text);
      rollbacks += compressed.rollbacks;

      // The whole-document guard is the honest end-to-end check: the per-block
      // rollback already fixed anything it caught, so a violation here is one
      // the guard cannot see block by block.
      const verdict = guardCompression(item.text, compressed.text);
      violations += verdict.violations.filter((violation) => violation.severity === "error").length;

      const saved = item.text.length - compressed.text.length;
      worst.push({ name: item.name, percent: item.text.length > 0 ? (saved / item.text.length) * 100 : 0 });
    }

    return {
      level,
      charsIn,
      charsOut,
      charsSavedPercent: charsIn > 0 ? ((charsIn - charsOut) / charsIn) * 100 : 0,
      tokensIn,
      tokensOut,
      tokensSavedPercent: tokensIn > 0 ? ((tokensIn - tokensOut) / tokensIn) * 100 : 0,
      rollbacks,
      violations,
      best: [...worst].sort((a, b) => b.percent - a.percent).slice(0, 5),
    };
  });

  return { files: corpus.length, charsIn, tokensIn, levels };
}

const report = Object.fromEntries(Object.entries(await corpora()).map(([name, corpus]) => [name, measure(corpus)]));

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, undefined, 2));
} else {
  for (const [name, section] of Object.entries(report)) {
    console.log(`\n${name}: ${section.files} files, ${section.charsIn.toLocaleString("en-US")} chars, ~${section.tokensIn.toLocaleString("en-US")} tokens`);
    console.log("  level  chars saved   tokens saved   rollbacks   guard errors");

    for (const row of section.levels) {
      const chars = `${row.charsSavedPercent.toFixed(2)} %`.padStart(11);
      const tokenPercent = `${row.tokensSavedPercent.toFixed(2)} %`.padStart(12);
      console.log(`  ${row.level.padEnd(6)} ${chars}   ${tokenPercent}   ${String(row.rollbacks).padStart(9)}   ${String(row.violations).padStart(12)}`);
    }

    const top = section.levels.at(-1);
    console.log(`  best at ${top.level}: ${top.best.map((item) => `${item.name} ${item.percent.toFixed(1)} %`).join(", ")}`);
  }

  console.log("\nGuard errors must be 0 at every level: a violation means a rule destroyed structure the rollback could not see.");
  console.log("The shipped corpora are already written in the compressed style, so they measure what filler is left, not what the rules can do.");
  console.log("The synthetic corpus is what an uncompressed answer looks like: that is the corpus the level table describes.");
}
