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

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const arguments_ = process.argv.slice(2);
const asJson = arguments_.includes("--json");
const exactOnly = arguments_.includes("--exact-only");

if (exactOnly) {
  process.env.RULE_MCP_CACHE_EXACT_ONLY = "1";
}

const stateDir = mkdtempSync(join(tmpdir(), "rule-cache-report-"));
process.env.RULE_MCP_STATE_DIR = stateDir;
process.env.RULE_MCP_NO_TELEMETRY = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
delete process.env.RULE_MCP_NO_CACHE;

const { loadAllSkills } = await import("../../../src/core/skills.js");
const { callTool, entryPathOf } = await import("../../../src/tools/router/index.js");
const { cacheClear, cacheEntries } = await import("../../../src/core/cache/_tool-cache.js");
const { CORPUS } = await import("../../../tests/fixtures/routing-corpus.mjs");

await loadAllSkills(true);

/**
 * One cacheable call per entry path, plus the two tools that read no skill.
 *
 * Not a benchmark: a sample wide enough that the invalidation and entry-path
 * numbers describe the cache rather than the harness that measured it.
 */
const WORKLOAD = [
  ["pix_tool", { prompt: "react button component" }],
  ["rule_tool_frontend_react", { mode: "tldr", query: "hooks" }],
  ["rule_tool_styleguide_css", { mode: "tldr", query: "container query" }],
  ["rule_tool_check", { skill: "rule-styleguide-css", code: "a{color:red}" }],
  ["rule_tool_search", { query: "container query" }],
  ["rule_tool_component", { component: "button", framework: "react" }],
  ["rule_tool_compress", { text: "It is important to note that this is filler." }],
];

/**
 * Rephrase a prompt the way a second person would ask the same thing: a
 * question opening, different capitalization, a pluralized last word. It has to
 * be a rephrasing and not a different question, or the number is a lie.
 *
 * @param {string} prompt
 * @returns {string}
 */
function rephrase(prompt) {
  const words = prompt.trim().split(/\s+/);
  const last = words.at(-1);
  const plural = /[a-z]$/.test(last) && !last.endsWith("s") ? `${last}s` : last;

  return `How do I ${[...words.slice(0, -1), plural].join(" ")}?`;
}

/**
 * Run every corpus prompt and tally the tier that answered.
 *
 * @param {(entry: object) => string} promptOf
 * @returns {Promise<object>}
 */
async function pass(promptOf) {
  const tiers = { exact: 0, normalized: 0, miss: 0 };
  const entries = {};
  for (const entry of CORPUS) {
    const result = await callTool("pix_tool", { prompt: promptOf(entry) });
    const tier = result?._meta?.pixCache?.tier ?? "miss";
    tiers[tier] += 1;
    const path = entryPathOf("pix_tool");
    entries[path] = (entries[path] ?? 0) + 1;
  }

  return { tiers, entries, calls: CORPUS.length };
}

cacheClear();

const checks = await correctness();

cacheClear();
const cold = await pass((entry) => entry.prompt);
const warm = await pass((entry) => entry.prompt);
const rephrased = await pass((entry) => rephrase(entry.prompt));

/**
 * What one skill edit would drop, per skill, without editing anything.
 *
 * An entry survives an edit to skill X exactly when X is not among the
 * dependencies it recorded, so this is a count over the stored entries and not
 * a simulation of a filesystem change.
 *
 * @returns {{ entries: number, worst: string, worstDependents: number, survival: number, unattributed: number }}
 */
function invalidationCost() {
  const entries = cacheEntries();
  const counts = {};
  let unattributed = 0;
  for (const entry of entries) {
    const names = Object.keys(entry.deps ?? {});
    if (names.length === 0) {
      unattributed += 1;
    }
    for (const name of names) {
      counts[name] = (counts[name] ?? 0) + 1;
    }
  }
  const [worst, worstDependents] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? ["none", 0];

  return {
    entries: entries.length,
    worst,
    worstDependents,
    survival: entries.length > 0 ? 1 - worstDependents / entries.length : 1,
    unattributed,
  };
}

/**
 * Two invariants, checked rather than assumed.
 *
 * Determinism: the same call, computed twice with the cache off, must produce
 * the same text. The whole cache rests on this, and nothing else verifies it.
 *
 * Parity: a cached hit must decorate to the same output as a miss. The one
 * permitted difference is `_meta.pixCache`, which names the tier that
 * answered and is the reason a hit is debuggable at all.
 *
 * @returns {Promise<{ determinism: string[], parity: string[], checked: number }>}
 */
async function correctness() {
  const determinism = [];
  const parity = [];

  process.env.RULE_MCP_NO_CACHE = "1";
  const uncached = new Map();
  for (const [tool, arguments_] of WORKLOAD) {
    const first = await callTool(tool, arguments_);
    const second = await callTool(tool, arguments_);
    const a = first?.content?.[0]?.text ?? "";
    const b = second?.content?.[0]?.text ?? "";
    if (a !== b) {
      determinism.push(tool);
    }
    uncached.set(tool, a);
  }
  delete process.env.RULE_MCP_NO_CACHE;

  cacheClear();
  for (const [tool, arguments_] of WORKLOAD) {
    const miss = await callTool(tool, arguments_);
    const hit = await callTool(tool, arguments_);
    if ((hit?.content?.[0]?.text ?? "") !== (miss?.content?.[0]?.text ?? "")) {
      parity.push(tool);
    }
    if (!hit?._meta?.pixCache?.tier) {
      parity.push(`${tool} (no tier reported)`);
    }
    if ((miss?.content?.[0]?.text ?? "") !== uncached.get(tool)) {
      parity.push(`${tool} (differs with cache off)`);
    }
  }

  return { determinism, parity, checked: WORKLOAD.length };
}

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
  const row = (label, result) =>
    `  ${label.padEnd(11)} exact ${String(result.exact).padStart(3)}   normalized ${String(result.normalized).padStart(3)}` +
    `   miss ${String(result.miss).padStart(3)}   hit rate ${Math.round(result.hitRate * 100)}%`;
  console.log(`cache report: ${report.corpus} corpus prompts, ${report.mode}`);
  console.log("");
  console.log(row("cold", report.cold));
  console.log(row("warm", report.warm));
  console.log(row("rephrased", report.rephrased));
  console.log("");
  const { invalidation } = report;
  console.log(`Invalidation: ${invalidation.entries} entries stored.`);
  console.log(`  worst single skill edit  ${invalidation.worst} (${invalidation.worstDependents} dependents)`);
  console.log(
    `  entries surviving it     ${Math.round(invalidation.survival * 100)}%   (was 0%: the namespace carried the skills mtime)`,
  );
  console.log(`  depending on no skill    ${invalidation.unattributed}   (no skill edit can touch these)`);
  console.log("");
  console.log(
    `Entry paths: ${Object.entries(report.byEntry)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ${v}`)
      .join("   ")}`,
  );
  console.log("");
  const { determinism, parity, checked } = report.correctness;
  const verdict = (label, failures) =>
    failures.length === 0
      ? `  ${label.padEnd(13)} ok across ${checked} calls`
      : `  ${label.padEnd(13)} FAILED: ${failures.join(", ")}`;
  console.log("Correctness:");
  console.log(verdict("determinism", determinism));
  console.log(verdict("hit parity", parity));
  console.log("");
  console.log("Rephrased is the case L1 exists for: the same question, typed by a second person.");
  console.log("Invalidation is computed from the recorded dependencies. No file is touched.");
}
