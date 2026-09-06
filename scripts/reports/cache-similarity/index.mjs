#!/usr/bin/env node
/**
 * @module scripts/cache-similarity-report
 *
 * Whether a similarity tier above the normalized key can be made safe.
 *
 * The cache plan called for L2: when the exact key and the normalized key both
 * miss, score the incoming prompt against the prompts already cached and replay
 * the closest one above a threshold. It also set the gate that decides whether
 * it ships - **wrong replays must be zero** - and pre-authorized the answer being
 * no: a similarity layer that adds risk without adding hits is worse than
 * nothing.
 *
 * This script is that measurement, kept because the decision it produced was
 * not to build the layer. Without the script the decision is an opinion, and the
 * next person to want L2 has to redo the work to find out it was already done.
 *
 * Method. Cache one entry per corpus prompt. Generate four variants of each -
 * a word short, a clause longer, the opener dropped, the tail swapped - which is
 * what a second person plausibly types for the same question. Discard the ones
 * canonicalization already merges, since the normalized key answers those. For
 * each of the rest, take the closest cached prompt by Jaccard over canonical
 * terms, and compare the route that entry holds against the route the live
 * router produces. A disagreement is a wrong replay: the caller receives an
 * answer to a question they did not ask and has no way to tell.
 *
 * Usage:
 *   node scripts/cache-similarity-report.mjs
 *   node scripts/cache-similarity-report.mjs --json
 *
 * @see docs/plans/deterministic-cache.md - section 3, L2
 * @see docs/adr/056 - the decision this produced
 */

process.env.RULE_MCP_NO_TELEMETRY ??= "1";
process.env.RULE_MCP_NO_AUTOUPDATE ??= "1";
// No cache: this measures what a similarity tier WOULD do, against live routing.
process.env.RULE_MCP_NO_CACHE = "1";

const asJson = process.argv.includes("--json");

const { loadAllSkills } = await import("../../../src/core/skills/_skills.js");
const { callTool } = await import("../../../src/tools/router/index.js");
const { canonicalizeQuery } = await import("../../../src/core/bm25/index.js");
const { CORPUS } = await import("../../../tests/fixtures/routing-corpus.mjs");

await loadAllSkills(true);

/** Thresholds worth reporting. Below 0.6 the candidates stop being rephrasings. */
const THRESHOLDS = [0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6];

/**
 * What a second person plausibly types for the same question.
 *
 * Deliberately not paraphrases: each variant keeps the words and changes the
 * framing, which is the case a similarity tier is supposed to catch and the
 * hardest case to distinguish from a different question.
 *
 * @param {string} prompt
 * @returns {string[]}
 */
function variants(prompt) {
  const words = prompt.trim().split(/\s+/);

  return [
    words.slice(0, -1).join(" "),
    `${prompt} in my project`,
    words.slice(1).join(" "),
    `${words.slice(0, -1).join(" ")} best approach`,
  ].filter((variant) => variant.trim().split(/\s+/).length >= 2);
}

const terms = (text) => new Set(canonicalizeQuery(text).split(" ").filter(Boolean));

/** @param {Set<string>} a @param {Set<string>} b @returns {number} */
function jaccard(a, b) {
  const union = new Set([...a, ...b]);
  if (union.size === 0) {
    return 0;
  }

  return [...a].filter((term) => b.has(term)).length / union.size;
}

/** @param {string} prompt @returns {Promise<string>} */
async function routeOf(prompt) {
  return JSON.parse((await callTool("pix_tool", { prompt })).content[0].text).route;
}

const stored = [];
for (const entry of CORPUS) {
  stored.push({ prompt: entry.prompt, terms: terms(entry.prompt), route: await routeOf(entry.prompt) });
}

const candidates = [];
for (const entry of CORPUS) {
  for (const variant of variants(entry.prompt)) {
    const variantTerms = terms(variant);
    let best;
    let mergedByL1 = false;
    for (const candidate of stored) {
      const score = jaccard(variantTerms, candidate.terms);
      if (score === 1) {
        mergedByL1 = true;
        break;
      }
      if (!best || score > best.score) {
        best = { ...candidate, score };
      }
    }
    if (mergedByL1 || !best) {
      continue;
    }
    candidates.push({ variant, best, live: await routeOf(variant) });
  }
}

const rows = THRESHOLDS.map((threshold) => {
  const replayed = candidates.filter((row) => row.best.score >= threshold);
  const wrong = replayed.filter((row) => row.best.route !== row.live);

  return { threshold, replayed: replayed.length, wrong: wrong.length };
});

const safe = rows.find((row) => row.wrong === 0 && row.replayed > 0);
const report = {
  corpus: CORPUS.length,
  variants: candidates.length,
  rows,
  safeThreshold: safe?.threshold,
  examples: candidates
    .filter((row) => row.best.score >= 0.8 && row.best.route !== row.live)
    .map((row) => ({
      variant: row.variant,
      wouldReplay: row.best.route,
      from: row.best.prompt,
      score: row.best.score,
      live: row.live,
    })),
};

if (asJson) {
  console.log(JSON.stringify(report, undefined, 2));
} else {
  console.log(
    `similarity report: ${report.corpus} corpus prompts, ${report.variants} variants the normalized key cannot answer`,
  );
  console.log("");
  console.log("  threshold   replayed   wrong   wrong rate");
  for (const row of report.rows) {
    console.log(
      `      ${row.threshold.toFixed(2)}   ${String(row.replayed).padStart(8)}   ${String(row.wrong).padStart(5)}   ${row.replayed > 0 ? Math.round((100 * row.wrong) / row.replayed) : 0}%`,
    );
  }
  console.log("");
  console.log(
    report.safeThreshold
      ? `A threshold of ${report.safeThreshold} replays with no wrong answers. L2 is viable.`
      : "No threshold both replays something and replays it correctly. L2 is not viable.",
  );
  console.log("");
  if (report.examples.length > 0) {
    console.log(`Wrong replays at 0.80 (${report.examples.length}):`);
    for (const example of report.examples) {
      console.log(`  "${example.variant}"`);
      console.log(`     would replay ${example.wouldReplay} from "${example.from}" at ${example.score.toFixed(2)}`);
      console.log(`     live route   ${example.live}`);
    }
  }
}
