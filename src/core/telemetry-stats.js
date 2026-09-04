/**
 * @module core/telemetry-stats
 *
 * Reading the telemetry back.
 *
 * One rule shapes the whole output: measured savings and estimated savings are
 * reported as separate numbers, and the estimate is always rendered with a
 * tilde. Cache payloads and caveman before-and-after are measured, byte for
 * byte. "What reading the whole skill file would have cost" is a model of a
 * thing that did not happen, and adding it to a measured total produces a
 * headline number nobody can defend.
 *
 * Every count here is a char/4 heuristic for tokens, which is why the tilde
 * belongs on the measured numbers too.
 *
 * @see module:core/telemetry-store - where the events come from
 */

/**
 * Percentile over a sorted-in-place copy. Nearest-rank, which is the honest
 * choice on the small samples a single session produces.
 *
 * @param {number[]} values
 * @param {number} p - 0 to 1
 * @returns {number}
 */
export function percentile(values, p) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1);

  return sorted[Math.max(0, index)];
}

/**
 * Fold events into the numbers the read surfaces show.
 *
 * @param {object[]} events
 * @returns {object}
 */
export function aggregate(events = []) {
  const calls = events.length;
  const durations = events.map((event) => Number(event.durationMs) || 0);
  const byTool = {};
  const bySkill = {};
  const byTier = {};
  const byEntry = {};
  let errors = 0;
  let cacheHits = 0;
  let savedTokens = 0;
  let estimatedTokens = 0;
  let guardrailFailures = 0;
  const savedBySource = {};

  for (const event of events) {
    byTool[event.tool] = (byTool[event.tool] ?? 0) + 1;

    if (event.routedSkill) {
      bySkill[event.routedSkill] = (bySkill[event.routedSkill] ?? 0) + 1;
    }

    if (event.ok === false) {
      errors += 1;
    }

    if (event.cacheHit) {
      cacheHits += 1;
    }

    if (event.cacheTier) {
      byTier[event.cacheTier] = (byTier[event.cacheTier] ?? 0) + 1;
    }

    if (event.entry) {
      byEntry[event.entry] = (byEntry[event.entry] ?? 0) + 1;
    }

    if (typeof event.guardrailFailures === "number") {
      guardrailFailures += event.guardrailFailures;
    }

    for (const [source, value] of Object.entries(event.saved ?? {})) {
      const amount = Number(value) || 0;
      savedTokens += amount;
      savedBySource[source] = (savedBySource[source] ?? 0) + amount;
    }

    estimatedTokens += Number(event.estimatedRouting) || 0;
  }

  return {
    calls,
    errors,
    errorRate: calls > 0 ? errors / calls : 0,
    cacheHits,
    cacheHitRate: calls > 0 ? cacheHits / calls : 0,
    latencyP50: percentile(durations, 0.5),
    latencyP95: percentile(durations, 0.95),
    savedTokens,
    savedBySource,
    estimatedTokens,
    guardrailFailures,
    byTool,
    bySkill,
    byTier,
    byEntry,
    sessions: new Set(events.map((event) => event.session)).size,
  };
}

/** @param {number} n @returns {string} */
const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

/** @param {object} counts @param {number} limit @returns {string[]} */
function top(counts, limit) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => `  ${String(count).padStart(5)}  ${name}`);
}

/**
 * Render the aggregate for a terminal or a tool result.
 *
 * @param {object} stats - from {@link aggregate}
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

/** @param {number} n @param {number} [digits] @returns {string} */
const pct = (n, digits = 1) => `${((Number(n) || 0) * 100).toFixed(digits)}%`;

/** @param {number} n @returns {string} thousands separated, so long numbers stay readable */
const num = (n) => (Number(n) || 0).toLocaleString("en-US");

/** @param {number} n @returns {string} */
const usd = (n) => `$${(Number(n) || 0).toFixed(4)}`;

/** @param {number} bytes @returns {string} */
const kb = (bytes) => `${Math.round((Number(bytes) || 0) / 1024)} KB`;

/** @param {number} ms @returns {string} mm:ss, which is how a session length is read */
function clock(ms) {
  const seconds = Math.round((Number(ms) || 0) / 1000);

  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * A two-column table of label and value. Markdown, because both read surfaces
 * that show this - a terminal and a tool result - render it acceptably.
 *
 * @param {Array<[string, string]>} rows
 * @returns {string[]}
 */
function table(rows) {
  const kept = rows.filter(([, value]) => value !== undefined && value !== "");

  return kept.length === 0 ? [] : ["| Metric | Value |", "|---|---:|", ...kept.map(([k, v]) => `| ${k} | ${v} |`), ""];
}

/** @param {object} counts @param {number} limit @returns {string[]} */
function countTable(counts, limit) {
  const rows = Object.entries(counts ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  return rows.length === 0 ? [] : ["| Name | Count |", "|---|---:|", ...rows.map(([k, v]) => `| ${k} | ${v} |`), ""];
}

/**
 * Render an exported `.flight` as numbers.
 *
 * Deliberately all tables and no prose, with one exception: the sentence that
 * says the routing estimate is modeled. That number is the largest in the file
 * and the only one that describes something which did not happen, so it never
 * appears without the sentence.
 *
 * @param {object} flight - a FlightFile from {@link module:core/telemetry-flight}
 * @returns {string}
 */
export function renderFlight(flight) {
  const kpi = flight?.kpi ?? {};
  const usage = flight?.usage;
  const project = flight?.project ?? {};
  const lines = [
    `# rule flight: ${flight?.session?.id ?? "unknown"}`,
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
      [
        "Share of the model's tokens",
        kpi.mcp?.shareOfLlmTokens === undefined ? undefined : pct(kpi.mcp.shareOfLlmTokens, 2),
      ],
      ["Cost of that share", kpi.mcp?.costUsd === undefined ? undefined : usd(kpi.mcp.costUsd)],
    ]),
    "## Tokens saved",
    "",
    ...table([
      ["Measured", `~${num(kpi.tokens?.measuredSaved)}`],
      ...Object.entries(kpi.tokens?.savedBySource ?? {}).map(([source, amount]) => [`  ${source}`, `~${num(amount)}`]),
      ["Caveman compression", kpi.tokens?.cavemanRatio === undefined ? undefined : pct(kpi.tokens.cavemanRatio)],
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
      // a replayed result is read by the model in full (ADR 079).
      ["Replayed output", kpi.cache?.replayedTokens ? `~${num(kpi.cache.replayedTokens)} tokens` : undefined],
      [
        "Recompute saved",
        kpi.cache?.recomputeSavedMsPerHit ? `~${num(kpi.cache.recomputeSavedMsPerHit)} ms per hit` : undefined,
      ],
    ]),
    ...countTable(kpi.cache?.byTier, 5),
    "## Guardrails",
    "",
    ...table([["Failures", num(kpi.guardrails?.failures)]]),
    ...countTable(kpi.guardrails?.byRule, 10),
  ];

  if (usage) {
    lines.push(
      `## Model usage (${usage.agent ?? "agent"})`,
      "",
      ...table([
        ["Model", usage.model],
        ["Provider", usage.provider],
        ["API calls", num(usage.apiCalls)],
        ["User turns", num(usage.userTurns)],
        ["Output tokens", num(usage.output)],
        ["Input tokens (uncached)", num(usage.input)],
        ["Cache read", num(usage.cacheRead)],
        ["Cache write", num(usage.cacheWrite)],
        ["Reasoning tokens", num(usage.reasoning)],
        ["Peak context", num(usage.peakContext)],
        ["Context window", usage.contextWindow === undefined ? undefined : num(usage.contextWindow)],
        ["Peak context used", usage.contextWindow ? pct(usage.peakContext / usage.contextWindow, 1) : undefined],
        ["Cost", usage.costUsd === undefined ? undefined : usd(usage.costUsd)],
      ]),
    );
  } else {
    lines.push(
      "## Model usage",
      "",
      "No agent transcript could be read for this project, so no model usage is",
      "reported. It is absent rather than zero on purpose: a zero would be averaged.",
      "",
    );
  }

  lines.push(
    "## Iterations",
    "",
    ...table([
      ["User prompts", num(kpi.iterations?.count)],
      ["Distinct prompts", num(kpi.iterations?.distinctPrompts)],
      ["Repeated prompts", num(kpi.iterations?.retries)],
      ["Counted how", kpi.iterations?.estimated ? "inferred from idle gaps" : "read from the agent transcript"],
    ]),
    "## Project",
    "",
    ...table([
      ["Source files", num(project.files?.total)],
      ["Source lines", num(project.lines?.total)],
      ["Components", num(project.components)],
      ["ADRs", num(project.adrs)],
      ["Test files", num(project.testFiles)],
      ["Source weight", kb(project.bytes?.source)],
      ["Dependencies weight", kb(project.bytes?.nodeModules)],
      ["Build weight", kb(project.bytes?.dist)],
      ["Code graph", project.tokensave?.present ? `present, ${kb(project.tokensave.dbBytes)}` : "absent"],
    ]),
    "## Productivity",
    "",
    ...table([
      [
        "Lines per prompt",
        kpi.productivity?.linesPerPrompt === undefined ? undefined : num(Math.round(kpi.productivity.linesPerPrompt)),
      ],
      [
        "Lines per minute",
        kpi.productivity?.linesPerMinute === undefined ? undefined : num(Math.round(kpi.productivity.linesPerMinute)),
      ],
      [
        "Cost per 1k output",
        kpi.productivity?.costPer1kOutput === undefined ? undefined : usd(kpi.productivity.costPer1kOutput),
      ],
      [
        "Cost per prompt",
        kpi.productivity?.costPerPrompt === undefined ? undefined : usd(kpi.productivity.costPerPrompt),
      ],
      ["Average per call", `${num(kpi.productivity?.avgPerCallMs)} ms`],
    ]),
  );

  if (Object.keys(kpi.routing?.bySkill ?? {}).length > 0) {
    lines.push("## Routed skills", "", ...countTable(kpi.routing.bySkill, 10));
  }

  if (Object.keys(kpi.routing?.byTool ?? {}).length > 0) {
    lines.push("## Tools", "", ...countTable(kpi.routing.byTool, 15));
  }

  return lines.join("\n");
}
