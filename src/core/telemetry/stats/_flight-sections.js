

/** @module core/telemetry/stats/flight-sections - the tail sections of the flight report */

import { countTable, kb, num, pct, table, usd } from "./_format.js";

/**
 * Model usage, or the sentence that says why it is absent.
 *
 * @param {object|undefined} usage
 * @returns {string[]}
 */
export function usageSection(usage) {
  if (!usage) {
    return [
      "## Model usage",
      "",
      "No agent transcript could be read for this project, so no model usage is",
      "reported. It is absent rather than zero on purpose: a zero would be averaged.",
      "",
    ];
  }

  return [
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
  ];
}

/**
 * The iterations and project tables.
 *
 * @param {object} kpi
 * @param {object} project
 * @returns {string[]}
 */
export function iterationsAndProject(kpi, project) {
  return [
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
  ];
}

/**
 * The productivity table.
 *
 * @param {object} kpi
 * @returns {string[]}
 */
export function productivitySection(kpi) {
  return [
    "## Productivity",
    "",
    ...table([
      ["Lines per prompt", kpi.productivity?.linesPerPrompt === undefined ? undefined : num(Math.round(kpi.productivity.linesPerPrompt))],
      ["Lines per minute", kpi.productivity?.linesPerMinute === undefined ? undefined : num(Math.round(kpi.productivity.linesPerMinute))],
      ["Cost per 1k output", kpi.productivity?.costPer1kOutput === undefined ? undefined : usd(kpi.productivity.costPer1kOutput)],
      ["Cost per prompt", kpi.productivity?.costPerPrompt === undefined ? undefined : usd(kpi.productivity.costPerPrompt)],
      ["Average per call", `${num(kpi.productivity?.avgPerCallMs)} ms`],
    ]),
  ];
}

/**
 * The routed-skill and tool count tables, present only when non-empty.
 *
 * @param {object} kpi
 * @returns {string[]}
 */
export function routingTables(kpi) {
  const lines = [];

  if (Object.keys(kpi.routing?.bySkill ?? {}).length > 0) {
    lines.push("## Routed skills", "", ...countTable(kpi.routing.bySkill, 10));
  }

  if (Object.keys(kpi.routing?.byTool ?? {}).length > 0) {
    lines.push("## Tools", "", ...countTable(kpi.routing.byTool, 15));
  }

  return lines;
}
