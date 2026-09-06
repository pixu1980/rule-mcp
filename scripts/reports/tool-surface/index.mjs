#!/usr/bin/env node
/**
 * @module scripts/tool-surface-report
 *
 * Measures what `tools/list` costs, because it is paid on every model turn.
 *
 * The tool surface is the one output nobody reads and everybody pays for: it
 * is sent with each request, before the model has decided to do anything. A
 * skill file only costs tokens when someone loads it; a tool description costs
 * tokens forever.
 *
 * The first run of this script found the weight was not where the plan assumed.
 * Descriptions were 12% of it. The other 82% was input schemas, and most of
 * that was the same seven property descriptions repeated once per skill tool.
 * Measure first, then optimize.
 *
 * Usage:
 *   node scripts/tool-surface-report.mjs            # report
 *   node scripts/tool-surface-report.mjs --json     # machine-readable
 *   node scripts/tool-surface-report.mjs --check    # fail if over the budget
 *
 * @see test/tool-surface-budget.test.mjs - the CI guard
 */

process.env.RULE_MCP_NO_TELEMETRY ??= "1";
process.env.RULE_MCP_NO_AUTOUPDATE ??= "1";

const { loadAllSkills } = await import("../../../src/core/skills/_skills.js");
const { listTools } = await import("../../../src/tools/router/index.js");

/** The char/4 heuristic used everywhere in this project. */
const tokens = (text) => Math.ceil(text.length / 4);

/**
 * Measure the surface.
 *
 * @returns {object} the report
 */
export async function measure() {
  await loadAllSkills(true);
  const tools = listTools();
  const wire = JSON.stringify(tools);

  const rows = tools.map((tool) => {
    const description = tool.description ?? "";
    const schema = JSON.stringify(tool.inputSchema ?? {});

    return {
      name: tool.name,
      descriptionTokens: tokens(description),
      schemaTokens: tokens(schema),
      totalTokens: tokens(description) + tokens(schema),
    };
  });

  const descriptionTokens = rows.reduce((sum, row) => sum + row.descriptionTokens, 0);
  const schemaTokens = rows.reduce((sum, row) => sum + row.schemaTokens, 0);

  return {
    tools: tools.length,
    totalTokens: tokens(wire),
    descriptionTokens,
    schemaTokens,
    // Anything the model has to read before it can decide anything.
    perTurnCost: tokens(wire),
    heaviest: [...rows].sort((a, b) => b.totalTokens - a.totalTokens).slice(0, 10),
    verboseDescriptions: rows.filter((row) => row.descriptionTokens > 60).map((row) => row.name),
  };
}

const report = await measure();

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, undefined, 2));
} else {
  console.log(`tools/list: ${report.tools} tools, ~${report.totalTokens} tokens on every model turn`);
  console.log(`  descriptions ~${report.descriptionTokens}   schemas ~${report.schemaTokens}`);
  console.log("");
  console.log("Heaviest:");
  for (const row of report.heaviest) {
    console.log(
      `  ~${String(row.totalTokens).padStart(4)}  ${row.name.padEnd(36)} desc ${row.descriptionTokens}, schema ${row.schemaTokens}`,
    );
  }
  if (report.verboseDescriptions.length > 0) {
    console.log("");
    console.log(`Descriptions over 60 tokens: ${report.verboseDescriptions.join(", ")}`);
  }
}

if (process.argv.includes("--check")) {
  const { TOOL_SURFACE_BUDGET_TOKENS } = await import("../../../src/core/tool-budget.js");
  if (report.totalTokens > TOOL_SURFACE_BUDGET_TOKENS) {
    console.error(`\nOver budget: ~${report.totalTokens} > ${TOOL_SURFACE_BUDGET_TOKENS} tokens.`);
    console.error("Every token here is paid on every model turn. Trim the surface or raise the budget deliberately.");
    process.exit(1);
  }
  console.log(`\nWithin budget: ~${report.totalTokens} / ${TOOL_SURFACE_BUDGET_TOKENS} tokens.`);
}
