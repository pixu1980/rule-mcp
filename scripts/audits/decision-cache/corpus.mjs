#!/usr/bin/env node


/**
 * @module scripts/audits/decision-cache/corpus
 *
 * Produce labeled samples for the L3 gate from a local paraphrase corpus.
 *
 * The run lives in `_run.mjs`: it computes each prompt's gold route with the
 * live `pix_tool`, seeds the cache, and writes the same shadow records a live
 * call would write. This file pins the environment, runs it, and prints the
 * report path. The state directory is dedicated and printed.
 *
 * Usage:
 *   node --import ./scripts/alias-hook.mjs scripts/audits/decision-cache/corpus.mjs \
 *     [--model laya] [--limit 0] [--state-dir path] [--json]
 */
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback) => {
  const index = argv.indexOf(name);

  return index !== -1 && argv[index + 1] && !argv[index + 1].startsWith("--") ? argv[index + 1] : fallback;
};

if (flag("--help")) {
  console.log("Usage: node --import ./scripts/alias-hook.mjs scripts/audits/decision-cache/corpus.mjs [--model laya] [--limit 0] [--state-dir path] [--json]");
  process.exit(0);
}

const model = value("--model", "laya");
const limit = Number(value("--limit", "0"));
const asJson = flag("--json");
const stateDir = value("--state-dir", mkdtempSync(join(tmpdir(), "rule-decision-cache-")));

if (!Number.isInteger(limit) || limit < 0) {
  console.error("--limit must be 0 (all) or a positive integer");
  process.exit(2);
}

process.env.RULE_MCP_SKILL_UNIVERSE ??= "base";
process.env.RULE_MCP_NO_SYNC_GUARD ??= "1";
process.env.RULE_MCP_STATE_DIR = stateDir;
process.env.RULE_MCP_DECISION_MODEL = model;
delete process.env.RULE_MCP_NO_CACHE;
delete process.env.RULE_MCP_DECISION_CACHE_REPLAY;
mkdirSync(stateDir, { recursive: true });

const { runCorpus } = await import("./_run.mjs");
let result;

try {
  result = await runCorpus({ model, limit });
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

const { seeds, rows, summary } = result;
const loo = rows.filter((row) => row.kind === "loo").length;
const covered = rows.filter((row) => row.kind === "loo" && row.goldRoute && row.candidates?.some((candidate) => candidate.route === row.goldRoute)).length;
const pct = (part, total) => (total === 0 ? "0.0" : ((part / total) * 100).toFixed(1));

console.log("Decision-cache corpus benchmark");
console.log(`state: ${stateDir}`);
console.log(`model: ${model}; groups: ${seeds.length}; samples: ${rows.length} (${loo} leave-one-out, ${rows.length - loo} negatives)`);
console.log(`would replay at the current floor: ${summary.wouldReplay} (${pct(summary.wouldReplay, summary.total)}%)`);
console.log(`false replays at the current floor: ${summary.currentWrong}`);
console.log(`labeled: ${summary.labeled}; unlabeled: ${summary.unlabeled}`);
console.log(`leave-one-out gold present in candidates: ${covered}/${loo} (${pct(covered, loo)}%)`);
console.log("negatives: no seed is the only safe choice");
console.log(`decision-cache hits: ${summary.cacheHits}`);
console.log(`mean model: ${summary.meanMs.toFixed(1)} ms; mean gold call: ${summary.meanGoldMs.toFixed(1)} ms`);
console.log(
  summary.recommended
    ? `recommended floor: ${summary.recommended.threshold.toFixed(2)} (${summary.recommended.predicted} predictions, ${summary.recommended.wrong} wrong)`
    : "recommended floor: none reaches zero false replays with at least 10 labeled predictions; keep shadow",
);
console.log("per sample:");

for (const row of rows) {
  const verdict = row.correct === true ? "ok" : row.correct === false ? "WRONG" : "-";

  console.log(
    `  ${row.kind.padEnd(10)} ${row.group.padEnd(18)} ${(row.choice ?? "-").padEnd(12)} ${String(row.probability ?? 0).padEnd(5)} ${verdict.padEnd(5)} gold=${row.goldRoute ?? "-"} cand=${row.candidateRoute ?? "-"}`,
  );
}

console.log(`report: RULE_MCP_STATE_DIR=${stateDir} pnpm report:decision-cache`);

if (asJson) {
  console.log(JSON.stringify({ stateDir, model, summary, rows }, null, 2));
}
