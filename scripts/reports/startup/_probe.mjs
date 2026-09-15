#!/usr/bin/env node


/**
 * @module scripts/reports/startup/probe
 *
 * The in-process half of the startup report: what each phase of a cold start
 * costs, and what it leaves in the heap.
 *
 * Spawned as a child by `./index.mjs` so the numbers are a real process's
 * numbers, not this process's after the report already imported everything.
 * Prints one JSON object on stdout.
 */

process.env.RULE_MCP_NO_TELEMETRY ??= "1";
process.env.RULE_MCP_NO_AUTOUPDATE ??= "1";

const ROOT = new URL("../../..", import.meta.url).pathname;
const rss = () => Math.round(process.memoryUsage().rss / 1024 / 1024);

const phases = {};
const mark = async (name, work) => {
  const startedAt = performance.now();
  const value = await work();
  phases[name] = { ms: Math.round((performance.now() - startedAt) * 10) / 10, rssMb: rss() };

  return value;
};

phases.baseline = { ms: 0, rssMb: rss() };

await mark("importEntry", () => import(`${ROOT}src/index.js`));
const { loadAllSkills } = await import(`${ROOT}src/core/skills/index.js`);
const { listTools } = await import(`${ROOT}src/tools/router/index.js`);

const skills = await mark("loadAllSkills", () => loadAllSkills(true));
const first = await mark("listTools", () => listTools());
await mark("listToolsAgain", () => listTools());

process.stdout.write(
  `${JSON.stringify({
    phases,
    tools: first.length,
    skills: Array.isArray(skills) ? skills.length : undefined,
    compileCache: process.env.NODE_COMPILE_CACHE ? "on" : "off",
  })}\n`,
);
