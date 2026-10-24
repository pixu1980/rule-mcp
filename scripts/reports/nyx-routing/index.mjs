#!/usr/bin/env node


/**
 * @module scripts/reports/nyx-routing
 *
 * Measures the real routing path, not a model of it: every prompt goes through
 * `callTool("rule_tool")`, so shared-sync bias, the name/tag scorer, the graph
 * candidates and the optional Nyx rerank all count.
 *
 * Run it twice, with and without the Nyx adapter, and compare:
 *
 *   node --import ./scripts/alias-hook.mjs scripts/reports/nyx-routing/index.mjs
 *   RULE_MCP_NO_NYX=1 node --import ./scripts/alias-hook.mjs scripts/reports/nyx-routing/index.mjs
 *
 * `RULE_MCP_NYX_MODE` selects the adapter mode (`reranker`, `prefilter`,
 * `ensemble`) when the adapter is on. The script is self-contained so the
 * baseline runs even when Nyx is not installed.
 *
 * @see docs/integration/rule-mcp.md
 */

process.env.RULE_MCP_NO_TELEMETRY ??= "1";
process.env.RULE_MCP_NO_AUTOUPDATE ??= "1";
// The benchmark measures the router, not the tool-result cache.
process.env.RULE_MCP_NO_CACHE = "1";

const asJson = process.argv.includes("--json");
const LIMIT = 6;
const { loadAllSkills } = await import("../../../src/core/skills/index.js");
const { callTool } = await import("../../../src/tools/router/index.js");
const { CORPUS } = await import("../../../tests/fixtures/routing-corpus.mjs");

await loadAllSkills(true);

const nyxOn = process.env.RULE_MCP_NO_NYX !== "1";
const label = nyxOn ? `router+nyx-${process.env.RULE_MCP_NYX_MODE ?? "ensemble"}` : "router";

let exact = 0;
let reachable = 0;
let reciprocalSum = 0;
let rankSum = 0;
/** @type {number[]} */
const latencies = [];
/** @type {Array<{ prompt: string, expect: string, top: string[] }>} */
const failures = [];

for (const entry of CORPUS) {
  const started = performance.now();
  const answer = JSON.parse((await callTool("rule_tool", { prompt: entry.prompt })).content[0].text);
  latencies.push(performance.now() - started);

  const routes = [answer.route, ...(answer.alternatives ?? []).map((alternative) => alternative.route)];
  const rank = routes.findIndex((route) => route.includes(entry.expect));

  if (rank === 0) {
    exact += 1;
  }

  if (rank !== -1 && rank < LIMIT) {
    reachable += 1;
  }

  if (rank === -1) {
    rankSum += LIMIT + 1; // a miss costs more than the last ranked place
    failures.push({ prompt: entry.prompt, expect: entry.expect, top: routes.slice(0, 3) });
  } else {
    reciprocalSum += 1 / (rank + 1);
    rankSum += rank + 1;
  }
}

latencies.sort((a, b) => a - b);
const count = CORPUS.length;
const report = {
  label,
  queries: count,
  exactAt1: exact / count,
  recallAt6: reachable / count,
  mrr: reciprocalSum / count,
  meanRank: rankSum / count,
  p50LatencyMs: latencies[Math.floor(count / 2)],
  failures,
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`# Routing benchmark (${label}, limit ${LIMIT})`);
  console.log(
    `exact@1=${report.exactAt1.toFixed(3)} recall@${LIMIT}=${report.recallAt6.toFixed(3)} ` +
      `mrr=${report.mrr.toFixed(3)} meanRank=${report.meanRank.toFixed(2)} p50=${report.p50LatencyMs.toFixed(2)}ms`,
  );
  console.log(`failures: ${failures.length}`);

  for (const failure of failures) {
    console.log(`  "${failure.prompt}" expected ${failure.expect} top: ${failure.top.join(", ")}`);
  }
}
