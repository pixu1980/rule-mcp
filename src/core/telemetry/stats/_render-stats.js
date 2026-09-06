/** @module core/telemetry/stats/render-stats */

import { compact, top } from "./_format.js";

/**
 * Render the aggregate for a terminal or a tool result.
 *
 * @param {object} stats - from {@link module:core/telemetry/stats/aggregate}
 * @param {{ title?: string }} [options]
 * @returns {string}
 */
export function renderStats(stats, options = {}) {
  const lines = [
    `# ${options.title ?? "rule telemetry"}`,
    "",
    `Calls: ${stats.calls} across ${stats.sessions} session(s)`,
    `Cache hit rate: ${(stats.cacheHitRate * 100).toFixed(0)}%   Error rate: ${(stats.errorRate * 100).toFixed(0)}%`,
    `Latency: p50 ${stats.latencyP50} ms, p95 ${stats.latencyP95} ms`,
    `Guardrail failures: ${stats.guardrailFailures}`,
    "",
    "## Tokens",
    "",
    `Measured saved: ~${compact(stats.savedTokens)}`,
  ];

  for (const [source, amount] of Object.entries(stats.savedBySource).sort((a, b) => b[1] - a[1])) {
    lines.push(`  ~${compact(amount)}  ${source}`);
  }

  lines.push(
    "",
    `Routing estimate: ~${compact(stats.estimatedTokens)}`,
    "This is an estimate of what reading the full skill files would have cost. It is",
    "modeled, not measured, and is deliberately not added to the total above.",
    "",
  );

  // Which tier answered, and by which path the call arrived. Both exist because
  // a hit rate on its own says nothing about which layer earned it, and P7's
  // lesson was that the unmeasured half is where the weight turns out to be.
  if (Object.keys(stats.byTier).length > 0) {
    const order = ["exact", "normalized", "similar", "miss"];
    const rows = order
      .filter((tier) => stats.byTier[tier] !== undefined)
      .map((tier) => `  ${String(stats.byTier[tier]).padStart(5)}  ${tier}`);

    lines.push("## Cache, by tier", "", ...rows, "");
  }

  if (Object.keys(stats.byEntry).length > 0) {
    lines.push("## Calls, by entry path", "", ...top(stats.byEntry, 6), "");
  }

  if (Object.keys(stats.byTool).length > 0) {
    lines.push("## Tools", "", ...top(stats.byTool, 10), "");
  }

  if (Object.keys(stats.bySkill).length > 0) {
    lines.push("## Routed skills", "", ...top(stats.bySkill, 10), "");
  }

  return lines.join("\n");
}
