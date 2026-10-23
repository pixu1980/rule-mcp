

/** Summarize the L3 decision-cache shadow records; phase 1 never replays. */
import { readShadows } from "../../../src/core/cache/tool-cache/_decision-shadow.js";

const events = readShadows();
const would = events.filter((event) => event.wouldReplay);
const cacheHits = events.filter((event) => event.decisionCacheHit);
const reasons = new Map();

for (const event of events) {
  reasons.set(event.reason, (reasons.get(event.reason) ?? 0) + 1);
}

const mean = (values) => (values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length);
const rate = (part) => (events.length === 0 ? 0 : Math.round((part / events.length) * 1000) / 10);

console.log("Decision-cache shadow report");
console.log(`records: ${events.length}`);
console.log(`would replay: ${would.length} (${rate(would.length)}%)`);
console.log(`decision-cache hits: ${cacheHits.length} (${rate(cacheHits.length)}%)`);
console.log(`mean probability (would replay): ${mean(would.map((event) => event.probability)).toFixed(3)}`);
console.log(`mean latency: ${mean(events.map((event) => event.ms)).toFixed(1)} ms`);
console.log(`candidates per call: ${mean(events.map((event) => event.candidates?.length ?? 0)).toFixed(1)}`);
console.log("reasons:");

for (const [reason, count] of [...reasons].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${reason}: ${count}`);
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(events, null, 2));
}
