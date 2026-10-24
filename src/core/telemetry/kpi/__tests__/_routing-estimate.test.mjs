/**
 * The routing estimate, checked against the files it claims to be about.
 *
 * `estimatedRouting` says what reading the full skill would have cost instead of
 * taking the router's answer. It is the one number in the report that is modeled
 * rather than measured, it is the largest, and nothing tied it to reality: a
 * model that drifted into a constant, or pointed at a skill the router did not
 * choose, would have gone on being reported next to measured savings.
 *
 * So every assertion here recomputes it from the file on disk and from the
 * answer that actually left the server. What is being tested is not the
 * arithmetic - it is that both ends of the subtraction are real.
 */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const stateDir = mkdtempSync(join(tmpdir(), "rule-mcp-estimate-state-"));
const projectDir = realpathSync(mkdtempSync(join(tmpdir(), "rule-mcp-estimate-project-")));
mkdirSync(join(projectDir, ".git"), { recursive: true });
process.env.RULE_MCP_STATE_DIR = stateDir;
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
process.env.RULE_MCP_NO_CACHE = "1";
delete process.env.RULE_MCP_NO_TELEMETRY;

const { computeKpi } = await import("../index.js");
const { loadAllSkills } = await import("../../../skills/index.js");
const { callTool, readSkill } = await import("../../../../tools/router/index.js");
const { flush } = await import("../../recorder/index.js");
const { readEvents } = await import("../../store/index.js");

await loadAllSkills();
process.chdir(projectDir);

const PROMPTS = ["I need a React button component", "postgres index for a slow query", "set up vite for a vanilla project", "should I use enum or a union type"];

const answers = [];
for (const prompt of PROMPTS) {
  const result = await callTool("rule_tool", { prompt });
  answers.push({ prompt, text: result.content.map((part) => part.text).join("") });
}

await callTool("rule_tool_check", { skill: "rule-mcp-styleguide-javascript", code: "export const a = 1;\n" });
flush();

const events = readEvents();
const routerEvents = events.filter((event) => event.tool === "rule_tool" && !event.cacheHit);
const tokens = (text) => Math.ceil(text.length / 4);

test("every routed call recorded an estimate", () => {
  assert.equal(routerEvents.length, PROMPTS.length, "each prompt was recorded once");
  assert.ok(
    routerEvents.every((event) => typeof event.estimatedRouting === "number"),
    "a routed answer carries the number it is compared against",
  );
});

test("the estimate is the routed skill's own size, not a constant", () => {
  const distinct = new Set(routerEvents.map((event) => event.estimatedRouting));
  assert.ok(distinct.size > 1, `four different skills cannot all cost the same: ${[...distinct].join(", ")}`);

  for (const [index, event] of routerEvents.entries()) {
    const route = JSON.parse(answers[index].text.split("## RULE-MCP WORKFLOW REMINDER", 1)[0]).route;
    const skill = readSkill(route);

    assert.ok(skill, `${route} has to be a skill on disk, or the estimate is about nothing`);
    const expected = Math.max(0, tokens(skill) - tokens(answers[index].text));
    assert.equal(event.estimatedRouting, expected, `${route}: the estimate has to be the file minus the answer, measured (got ${event.estimatedRouting}, recomputed ${expected})`);
  }
});

test("the estimate never claims more than reading the file would cost", () => {
  for (const [index, event] of routerEvents.entries()) {
    const route = JSON.parse(answers[index].text.split("## RULE-MCP WORKFLOW REMINDER", 1)[0]).route;

    assert.ok(event.estimatedRouting <= tokens(readSkill(route)), `${route}: a saving larger than the file it avoids reading is not a saving`);
    assert.ok(event.estimatedRouting >= 0, "and it is never negative");
  }
});

test("the estimate is positive exactly when the skill costs more than the answer", () => {
  // Measured on this corpus: a large skill is worth routing to
  // (rule-mcp-frontend-react is ~6100 tokens against a ~1900-token answer), and a
  // small one is not - rule-mcp-toolchain-vite is ~510 tokens while the router's
  // own answer, which lists every skill, is ~1400. Routing that prompt costs
  // more than reading the file. The estimate says zero, and zero is the honest
  // answer rather than a missing field.
  let sawSaving = false;
  let sawNone = false;

  for (const [index, event] of routerEvents.entries()) {
    const route = JSON.parse(answers[index].text.split("## RULE-MCP WORKFLOW REMINDER", 1)[0]).route;
    const bigger = tokens(readSkill(route)) > tokens(answers[index].text);

    assert.equal(event.estimatedRouting > 0, bigger, `${route}: the sign has to follow the measurement`);
    sawSaving ||= event.estimatedRouting > 0;
    sawNone ||= event.estimatedRouting === 0;
  }

  assert.ok(sawSaving, "at least one route on this corpus is worth taking");
  assert.ok(sawNone, "and at least one is not, which the report has to be able to say");
});

test("only the router estimates, and the estimate stays out of the measured total", () => {
  const check = events.find((event) => event.tool === "rule_tool_check");
  assert.ok(check, "the check call was recorded");
  assert.equal(check.estimatedRouting, undefined, "a tool that routes nothing estimates nothing");

  const kpi = computeKpi({ events });
  assert.ok(kpi.tokens.estimatedRouting > 0, "the estimate is reported");
  assert.equal(Object.keys(kpi.tokens.savedBySource).includes("estimatedRouting"), false, "and never as a source of measured saving");
  assert.ok(kpi.tokens.measuredSaved < kpi.tokens.estimatedRouting, "on this corpus the model dwarfs what was measured, which is why the two are kept apart");
});
