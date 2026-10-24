/** The Italian slice's baseline: the number Step 5 must improve on. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

process.env.RULE_MCP_NO_CACHE = "1";
process.env.RULE_MCP_SKILL_UNIVERSE = "base";

const { loadAllSkills } = await import("../index.js");
const { callTool, getSkillNames } = await import("../../../tools/router/index.js");
const { CORPUS_IT } = await import("../../../../tests/fixtures/routing-corpus-it.mjs");

await loadAllSkills(true);

async function route(prompt) {
  return JSON.parse((await callTool("rule_tool", { prompt })).content[0].text);
}

const results = [];
for (const entry of CORPUS_IT) {
  const answer = await route(entry.prompt);
  const alternatives = (answer.alternatives ?? []).map((alternative) => alternative.route);

  results.push({
    ...entry,
    got: answer.route,
    exact: answer.route.includes(entry.expect),
    inAlternatives: alternatives.some((name) => name.includes(entry.expect)),
  });
}

const exact = results.filter((result) => result.exact).length;
const top = results.filter((result) => result.exact || result.inAlternatives).length;
const unknown = results.filter((result) => result.got === "unknown" || result.got === "none").length;

/** Measured on this checkout; a router change that moves it owns the change. */
const BASELINE = { exact: 2, top: 3, unknown: 5, total: CORPUS_IT.length };

test("the Italian slice records its current baseline", () => {
  console.log(`Italian slice: ${exact}/${results.length} exact, ${top}/${results.length} top-or-alternative, ${unknown}/${results.length} unknown`);

  assert.deepEqual({ exact, top, unknown, total: results.length }, BASELINE);
});

test("every Italian expectation names a skill that exists", () => {
  const skillNames = getSkillNames();
  const missing = CORPUS_IT.filter((entry) => skillNames.every((name) => !name.includes(entry.expect))).map((entry) => `${entry.expect} (${entry.prompt})`);

  assert.deepEqual(missing, [], `the Italian slice expects a skill no skill carries:\n  ${missing.join("\n  ")}`);
});
