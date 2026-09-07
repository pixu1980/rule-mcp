/**
 * @module test/routing-corpus.test
 *
 * Routing quality as a number, so a change to a skill or to the scorer moves it
 * visibly instead of silently.
 *
 * Two thresholds, both below where the scorer currently sits so an ordinary
 * skill edit does not fail the build. They exist to catch a regression, not to
 * pin an exact score: routing is a ranking problem and the last few percent are
 * genuine judgment calls about prompts two skills both answer.
 *
 * The third assertion is the one that matters most. Nonsense must stay
 * uncertain: a scorer that always produces an answer is worse than one that
 * admits it does not know, because the caller cannot tell the two apart.
 *
 * @see test/routing-corpus.mjs - the prompts
 * @see docs/adr/048 - why BM25 replaced the hand-rolled scorer
 */

import test from "node:test";
import assert from "node:assert/strict";

process.env.RULE_MCP_NO_TELEMETRY = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
// Hermetic: a routing measurement has to come from the scorer, not from a core
// some earlier run cached. This suite asked the same prompts a probe had just
// asked, and read back answers computed before the code under test existed.
process.env.RULE_MCP_NO_CACHE = "1";
// The thresholds were measured on the source skill set; the four target-only
// skills (custom-element, template-engine, vanilla-reactive, auth) are real
// routing targets in the union, but their bodies dilute the term-document
// frequencies the pinned scores assume - measure on the source-commensurate
// universe (note in src/tools/router/index.js TARGET_ONLY_SKILLS).
process.env.RULE_MCP_SKILL_UNIVERSE = "base";

const { loadAllSkills } = await import("../../src/core/skills/index.js");
const { callTool } = await import("../../src/tools/router/index.js");
const { CORPUS, NONSENSE, PERSONAS, NOT_PERSONAS } = await import("../fixtures/routing-corpus.mjs");

/** Measured at 87% exact and 100% top-or-alt when BM25 landed (ADR 048). */
const MIN_EXACT = 0.8;
const MIN_TOP_OR_ALT = 0.95;

await loadAllSkills(true);

/** @param {string} prompt @returns {Promise<object>} */
async function route(prompt) {
  return JSON.parse((await callTool("pix_tool", { prompt })).content[0].text);
}

const results = [];
for (const entry of CORPUS) {
  const answer = await route(entry.prompt);
  const alternatives = (answer.alternatives ?? []).map((alternative) => alternative.route);
  results.push({
    ...entry,
    got: answer.route,
    exact: answer.route.includes(entry.expect),
    inAlternatives: alternatives.some((name) => name.includes(entry.expect)),
  });
}

test("the corpus routes to the intended skill", () => {
  const exact = results.filter((result) => result.exact).length;
  const rate = exact / results.length;
  const missed = results.filter((result) => !result.exact).map((result) => `${result.prompt} -> ${result.got}`);
  console.log(`  exact: ${exact}/${results.length} (${Math.round(rate * 100)}%)`);
  assert.ok(rate >= MIN_EXACT, `routing fell to ${Math.round(rate * 100)}%, below the ${MIN_EXACT * 100}% floor.\n  ${missed.join("\n  ")}`);
});

test("a near miss still offers the right skill", () => {
  const reachable = results.filter((result) => result.exact || result.inAlternatives).length;
  const rate = reachable / results.length;
  const unreachable = results.filter((result) => !result.exact && !result.inAlternatives).map((result) => `${result.prompt} -> ${result.got}`);
  console.log(`  top-or-alternative: ${reachable}/${results.length} (${Math.round(rate * 100)}%)`);
  assert.ok(rate >= MIN_TOP_OR_ALT, `the intended skill is unreachable for ${unreachable.length} prompt(s):\n  ${unreachable.join("\n  ")}`);
});

test("nonsense stays uncertain", async () => {
  for (const prompt of NONSENSE) {
    const answer = await route(prompt);
    assert.ok(
      answer.uncertain === true || answer.route === "unknown" || answer.route === "none",
      `"${prompt}" routed confidently to ${answer.route}. A scorer that always answers cannot be trusted when it does.`,
    );
  }
});

test("the router still returns its full contract", async () => {
  const answer = await route("react component with a form");
  for (const field of ["route", "confidence", "sections", "next_tools", "alternatives", "skills_available"]) {
    assert.ok(field in answer, `the router dropped ${field} from its output`);
  }
  assert.ok(Array.isArray(answer.sections) && answer.sections.length > 0, "sections must name where the answer came from");
});

// ── Personas (D.3): the role is named and rule_tool_plan is offered ──

const personaAnswers = [];
for (const entry of PERSONAS) {
  personaAnswers.push({ ...entry, answer: await route(entry.prompt) });
}

test("a persona request names the role it asks for", () => {
  const wrong = personaAnswers
    .filter((entry) => entry.answer.persona?.role !== entry.role)
    .map((entry) => `${entry.prompt} -> ${entry.answer.persona?.role ?? "none"} (wanted ${entry.role})`);

  assert.deepEqual(wrong, [], `every persona phrasing has to resolve to its role:\n  ${wrong.join("\n  ")}`);
});

test("a persona request is pointed at rule_tool_plan", () => {
  const missing = personaAnswers.filter((entry) => !(entry.answer.next_tools ?? []).includes("rule_tool_plan")).map((entry) => entry.prompt);

  assert.deepEqual(missing, [], "the persona surface is rule_tool_plan, so the answer has to offer it");
});

const negativeAnswers = [];
for (const prompt of NOT_PERSONAS) {
  negativeAnswers.push({ prompt, answer: await route(prompt) });
}

test("ordinary work is not mistaken for a persona", () => {
  const overreach = negativeAnswers.filter((entry) => entry.answer.persona).map((entry) => `${entry.prompt} -> ${entry.answer.persona.role}`);

  assert.deepEqual(overreach, [], `a subject is not a persona:\n  ${overreach.join("\n  ")}`);
});
