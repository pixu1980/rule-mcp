

/** Summarize the L3 decision-cache shadow records: precision, floor sweep, latency. */
import { readShadows, summarizeShadows } from "../../../src/core/cache/tool-cache/_decision-shadow.js";

const events = readShadows();
const summary = summarizeShadows(events);
const pct = (part, total) => (total === 0 ? "0.0" : ((part / total) * 100).toFixed(1));
const ms = (value) => value.toFixed(1);

console.log("Decision-cache shadow report");
console.log(`records: ${summary.total}`);
console.log(`would replay at the current floor: ${summary.wouldReplay} (${pct(summary.wouldReplay, summary.total)}%)`);
console.log(`false replays at the current floor: ${summary.currentWrong}`);
console.log(`predictions labeled: ${summary.labeled}; unlabeled: ${summary.unlabeled}`);
console.log(`decision-cache hits: ${summary.cacheHits} (${pct(summary.cacheHits, summary.total)}%)`);
console.log(`mean model time: ${ms(summary.meanMs)} ms; mean compute time: ${ms(summary.meanGoldMs)} ms`);

if (summary.meanMs > summary.meanGoldMs && summary.meanGoldMs > 0) {
  console.log("note: the model costs more than the compute; replay is a consistency tier here, not a latency win");
}

console.log("threshold sweep:");

for (const row of summary.thresholds) {
  const precision = row.precision === null ? "n/a" : `${(row.precision * 100).toFixed(1)}%`;

  console.log(`  ${row.threshold.toFixed(2)}: ${row.predicted} predicted, ${row.wrong} wrong, precision ${precision}`);
}

console.log(
  summary.recommended
    ? `recommended floor: ${summary.recommended.threshold.toFixed(2)} (${summary.recommended.predicted} predictions, ${summary.recommended.wrong} wrong)`
    : "recommended floor: none with zero false replays and at least 10 predictions; keep shadow",
);
console.log("reasons:");

for (const [reason, count] of Object.entries(summary.reasons).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${reason}: ${count}`);
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ summary, events }, null, 2));
}
