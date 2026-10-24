#!/usr/bin/env node
/**
 * @module scripts/reports/nyx-similarity
 *
 * Whether the Nyx similarity tier can be made safe.
 *
 * The cache-similarity report measured L2 without labels and rejected it:
 * similarity alone replays the wrong route for a rephrased prompt. This report
 * measures the same corpus with the label gate on, and reports both columns so
 * the gate's contribution is visible rather than asserted:
 *
 *   - ungated: closest stored prompt by embedding similarity;
 *   - gated:   closest stored prompt that also carries the same Nyx
 *              decision labels (`cacheGroup`).
 *
 * A wrong replay means the stored route differs from the live route for the
 * same prompt. The ship gate is wrong === 0 with replayed > 0.
 *
 * Embeddings default to Nyx's local lexical embedder, so this runs with no
 * model server. Point RULE_MCP_NYX_CONFIG at a config with a real
 * embeddings model to measure that instead.
 *
 * Usage:
 *   node --import ./scripts/alias-hook.mjs scripts/reports/nyx-similarity/index.mjs
 *   node --import ./scripts/alias-hook.mjs scripts/reports/nyx-similarity/index.mjs --json
 *
 * @see docs/integration/rule.md
 */

process.env.RULE_MCP_NO_TELEMETRY ??= "1";
process.env.RULE_MCP_NO_AUTOUPDATE ??= "1";
// The measurement must see live routing, not a replayed core.
process.env.RULE_MCP_NO_CACHE = "1";

import { isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";

const asJson = process.argv.includes("--json");
const THRESHOLDS = [0.995, 0.99, 0.98, 0.97, 0.96, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7];

const { loadAllSkills } = await import("../../../src/core/skills/index.js");
const { callTool } = await import("../../../src/tools/router/index.js");
const { CORPUS } = await import("../../../tests/fixtures/routing-corpus.mjs");
const { variants } = await import("../cache-similarity/_similarity.mjs");

// Nyx is optional in this checkout: resolve it the way the runtime loader does.
const configuredModule = process.env.RULE_MCP_NYX_MODULE;
const nyxSpecifier = configuredModule ? (isAbsolute(configuredModule) ? pathToFileURL(configuredModule).href : configuredModule) : "nyx/mcp";
const { createDefaultNyxConfig, createMcpAdapter, createMcpAdapterFromConfigFile } = await import(nyxSpecifier);

await loadAllSkills(true);

const configPath = process.env.RULE_MCP_NYX_CONFIG;
// Threshold 0 so every candidate reaches the label check and returns its
// similarity; the thresholds are applied here, not inside the adapter.
const adapter = configPath
  ? await createMcpAdapterFromConfigFile(configPath, { cacheSimilarityThreshold: 0, logger: null })
  : createMcpAdapter({ config: createDefaultNyxConfig({ engine: { enabled: true, embeddings: { enabled: true } } }), cacheSimilarityThreshold: 0, logger: null });

if (!adapter.embed) {
  console.error("This report needs embeddings. Set RULE_MCP_NYX_CONFIG to a config with engine.embeddings.enabled.");
  process.exit(2);
}

/** @param {string} prompt @returns {Promise<string>} */
async function routeOf(prompt) {
  return JSON.parse((await callTool("rule_tool", { prompt })).content[0].text).route;
}

/** @param {string} prompt */
async function storedEntry(prompt) {
  const decision = await adapter.classify({ text: prompt, scope: "cache" });
  const [embedding] = await adapter.embed([prompt]);

  return { prompt, route: await routeOf(prompt), cacheGroup: decision.decision.cacheGroup, embedding };
}

const stored = [];
for (const entry of CORPUS) {
  stored.push(await storedEntry(entry.prompt));
}

/** @type {Array<{ variant: string, live: string, bestGated: any, bestUngated: any }>} */
const candidates = [];
for (const entry of CORPUS) {
  for (const variant of variants(entry.prompt)) {
    const live = await routeOf(variant);
    let bestGated = null;
    let bestUngated = null;

    for (const item of stored) {
      const verdict = await adapter.shouldReplay({
        query: variant,
        entry: { text: item.prompt, cacheGroup: item.cacheGroup, embedding: item.embedding },
      });
      const candidate = { ...item, similarity: verdict.similarity ?? 0 };

      if (!bestUngated || candidate.similarity > bestUngated.similarity) {
        bestUngated = candidate;
      }
      if (verdict.replay && (!bestGated || candidate.similarity > bestGated.similarity)) {
        bestGated = candidate;
      }
    }

    candidates.push({ variant, live, bestGated, bestUngated });
  }
}

const rows = THRESHOLDS.map((threshold) => {
  const gated = candidates.filter((row) => row.bestGated && row.bestGated.similarity >= threshold);
  const ungated = candidates.filter((row) => row.bestUngated && row.bestUngated.similarity >= threshold);

  return {
    threshold,
    gatedReplayed: gated.length,
    gatedWrong: gated.filter((row) => row.bestGated.route !== row.live).length,
    ungatedReplayed: ungated.length,
    ungatedWrong: ungated.filter((row) => row.bestUngated.route !== row.live).length,
  };
});

const safeRows = rows.filter((row) => row.gatedWrong === 0 && row.gatedReplayed > 0);
// Thresholds descend: the last safe row is the lowest safe threshold, which is
// the useful number - it replays the most without ever replaying the wrong one.
const safe = safeRows.at(-1);
const report = { corpus: CORPUS.length, variants: candidates.length, rows, safeThreshold: safe?.threshold ?? null };

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`# Nyx similarity gate (corpus ${report.corpus}, variants ${report.variants})`);
  console.log("threshold  gated: replayed/wrong   ungated: replayed/wrong");

  for (const row of rows) {
    console.log(
      `   ${row.threshold.toFixed(2)}        ${String(row.gatedReplayed).padStart(4)}/${String(row.gatedWrong).padEnd(4)}          ` +
        `${String(row.ungatedReplayed).padStart(4)}/${String(row.ungatedWrong).padEnd(4)}`,
    );
  }

  console.log(`safe threshold: ${report.safeThreshold ?? "none (the gate is not safe on this corpus)"}`);
}
