#!/usr/bin/env node


/**
 * @module scripts/cache-report
 *
 * What the cache actually answers, per tier.
 *
 * P7 spent a phase optimizing descriptions because nobody had measured that
 * descriptions were an eighth of the weight. The cache work is under the same
 * rule: no layer lands without its number moving, and the number needs a
 * harness that produces it the same way every time.
 *
 * Runs the routing corpus twice against a scratch state directory. The first
 * pass is all misses by construction and populates the cache; the second pass
 * replays it. Then it runs the corpus a third time with every prompt rephrased,
 * which is the case L1 exists for and the case L0 cannot answer.
 *
 * Then it reports what a single skill edit would cost. Before R3 the answer was
 * the whole cache, every time, because the namespace carried the mtime of
 * `skills/`. Now each entry records the digests of the skills that produced it,
 * so the question has a per-skill answer and it is computed rather than
 * simulated: no file is touched.
 *
 * A mixed workload runs after it, one call per entry path, because the corpus
 * passes only ever call the router: the first version of this report said zero
 * entries depended on no skill, which was true of the report and not of the
 * cache. Template tools are cached with no dependencies and no skill edit can
 * reach them, and that only shows if something calls one.
 *
 * Last, the correctness checks. A deterministic cache whose determinism nobody
 * verifies is an assumption, and the two that matter are that computing the same
 * call twice gives the same answer, and that a cached hit decorates to the same
 * output as a miss.
 *
 * Also reports the entry-path split, which is the number R8 is gated on.
 *
 * Usage:
 *   node scripts/cache-report.mjs
 *   node scripts/cache-report.mjs --json
 *   node scripts/cache-report.mjs --exact-only   # L0 only, the before number
 *
 * @see docs/plans/deterministic-cache.md - section 8
 */

import { rmSync } from "node:fs";

import { asJson, cacheClear, callTool, entryPathOf, exactOnly, stateDir } from "./_context.mjs";
import { correctness, invalidationCost, pass } from "./_measure.mjs";
import { renderReport } from "./_render.mjs";
import { rephrase, WORKLOAD } from "./_workload.mjs";

const { CORPUS } = await import("../../../tests/fixtures/routing-corpus.mjs");

cacheClear();

const checks = await correctness();

cacheClear();
const cold = await pass((entry) => entry.prompt);
const warm = await pass((entry) => entry.prompt);
const rephrased = await pass((entry) => rephrase(entry.prompt));

const hitRate = (result) => (result.tiers.exact + result.tiers.normalized) / result.calls;
const report = {
  corpus: CORPUS.length,
  mode: exactOnly ? "L0 only" : "L0 + L1",
  cold: { ...cold.tiers, hitRate: hitRate(cold) },
  warm: { ...warm.tiers, hitRate: hitRate(warm) },
  rephrased: { ...rephrased.tiers, hitRate: hitRate(rephrased) },
  byEntry: cold.entries,
  correctness: checks,
  invalidation: undefined,
};

// The mixed workload runs last so the invalidation and entry-path numbers cover
// more than the router. Without it, "entries depending on no skill" read zero.
const mixedEntries = {};
for (const [tool, arguments_] of WORKLOAD) {
  await callTool(tool, arguments_);
  const path = entryPathOf(tool);
  mixedEntries[path] = (mixedEntries[path] ?? 0) + 1;
}
report.byEntry = { ...report.byEntry };
for (const [path, count] of Object.entries(mixedEntries)) {
  report.byEntry[path] = (report.byEntry[path] ?? 0) + count;
}
report.invalidation = invalidationCost();

rmSync(stateDir, { recursive: true, force: true });

if (asJson) {
  console.log(JSON.stringify(report, undefined, 2));
} else {
  renderReport(report);
}
