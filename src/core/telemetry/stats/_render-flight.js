

/** @module core/telemetry/stats/render-flight */

import { clock, countTable, num, pct, table, usd } from "./_format.js";
import { iterationsAndProject, productivitySection, routingTables, usageSection } from "./_flight-sections.js";

/**
 * Render an exported `.flight` as numbers.
 *
 * Deliberately all tables and no prose, with one exception: the sentence that
 * says the routing estimate is modeled. That number is the largest in the file
 * and the only one that describes something which did not happen, so it never
 * appears without the sentence.
 *
 * @param {object} flight - a FlightFile from {@link module:core/telemetry/flight}
 * @returns {string}
 */
export function renderFlight(flight) {
  const kpi = flight?.kpi ?? {};
  const lines = [
    `# rule-mcp flight: ${flight?.session?.id ?? "unknown"}`,
    "",
    // A reader has to know which variant is in front of them: absent prompts
    // in a redacted flight mean "removed for sharing", not "never recorded".
    ...(flight?.redacted ? ["> Redacted export: no prompt text, no absolute paths.", ""] : []),
    ...table([
      ["Exported", new Date(flight?.exportedAt ?? 0).toISOString()],
      ["Sessions", num(flight?.sessions?.length ?? 0)],
      ["Client", flight?.sessions?.find((session) => session.client)?.client],
      ["Active time", clock(kpi.productivity?.activeMs)],
      ["Calls", num(kpi.calls?.total)],
      ["Tool calls / resource reads", `${num(kpi.calls?.tools)} / ${num(kpi.calls?.resources)}`],
      ["Distinct tools", num(kpi.calls?.distinctTools)],
      ["Error rate", pct(kpi.calls?.errorRate, 0)],
      ["Latency p50 / p95", `${num(kpi.latency?.p50)} / ${num(kpi.latency?.p95)} ms`],
    ]),
    "## MCP token footprint",
    "",
    ...table([
      ["Result tokens returned", `~${num(kpi.mcp?.resultTokens)}`],
      ["Result bytes", num(kpi.mcp?.resultBytes)],
      ["Argument tokens received", `~${num(kpi.mcp?.argsTokens)}`],
      ["Average result", `~${num(kpi.mcp?.avgResultTokens)} tokens`],
      ["Share of the model's tokens", kpi.mcp?.shareOfLlmTokens === undefined ? undefined : pct(kpi.mcp.shareOfLlmTokens, 2)],
      ["Cost of that share", kpi.mcp?.costUsd === undefined ? undefined : usd(kpi.mcp.costUsd)],
    ]),
    "## Tokens saved",
    "",
    ...table([
      ["Measured", `~${num(kpi.tokens?.measuredSaved)}`],
      ...Object.entries(kpi.tokens?.savedBySource ?? {}).map(([source, amount]) => [`  ${source}`, `~${num(amount)}`]),
      ["Compression compression", kpi.tokens?.compressionRatio === undefined ? undefined : pct(kpi.tokens.compressionRatio)],
      ["Reminder overhead", kpi.tokens?.reminderOverhead ? `~${num(kpi.tokens.reminderOverhead)}` : undefined],
      ["Routing estimate", `~${num(kpi.tokens?.estimatedRouting)}`],
    ]),
    "The routing estimate models what reading the full skill files would have cost.",
    "It is modeled, not measured, and is never added to the measured total above.",
    "",
    "## Cache",
    "",
    ...table([
      ["Hit rate", pct(kpi.cache?.hitRate, 0)],
      ["Hits", num(kpi.cache?.hits)],
      // Output the cache served, reported here rather than under tokens saved:
      // a replayed result is read by the model in full (ADR 076).
      ["Replayed output", kpi.cache?.replayedTokens ? `~${num(kpi.cache.replayedTokens)} tokens` : undefined],
      ["Recompute saved", kpi.cache?.recomputeSavedMsPerHit ? `~${num(kpi.cache.recomputeSavedMsPerHit)} ms per hit` : undefined],
    ]),
    ...countTable(kpi.cache?.byTier, 5),
    "## Guardrails",
    "",
    ...table([["Failures", num(kpi.guardrails?.failures)]]),
    ...countTable(kpi.guardrails?.byRule, 10),
    ...usageSection(flight?.usage),
    ...iterationsAndProject(kpi, flight?.project ?? {}),
    ...productivitySection(kpi),
    ...routingTables(kpi),
  ];

  return lines.join("\n");
}
