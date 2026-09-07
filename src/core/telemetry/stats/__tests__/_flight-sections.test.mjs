/** The flight-report tail sections: usage, project, productivity, routing. */
import { strict as assert } from "node:assert";
import test from "node:test";

import { iterationsAndProject, productivitySection, routingTables, usageSection } from "../_flight-sections.js";

const KPI = (overrides = {}) => ({
  iterations: { count: 3, distinctPrompts: 2, retries: 1, estimated: false },
  productivity: { linesPerPrompt: 10, linesPerMinute: 200, costPer1kOutput: 0.5, costPerPrompt: 0.02, avgPerCallMs: 12 },
  routing: { bySkill: { "rule-frontend-react": 2 }, byTool: { pix_tool: 3 } },
  ...overrides,
});

test("usageSection renders a full and an absent usage block", () => {
  const absent = usageSection();
  assert.match(absent.join("\n"), /No agent transcript/, "absence is explained, not zeroed");

  const full = usageSection({
    agent: "pi",
    model: "m",
    provider: "p",
    apiCalls: 2,
    userTurns: 1,
    output: 50,
    input: 100,
    cacheRead: 20,
    cacheWrite: 5,
    reasoning: 3,
    peakContext: 200,
    contextWindow: 8000,
    costUsd: 1.1,
  });
  const text = full.join("\n");
  assert.match(text, /Model usage \(pi\)/, "the agent names the section");
  assert.match(text, /8,000/, "the context window renders");
  assert.match(text, /2\.5%/, "the peak-used percentage renders");
  assert.match(text, /1\.1/, "the cost renders");

  const partial = usageSection({ apiCalls: 1 });
  assert.doesNotMatch(partial.join("\n"), /undefined/, "absent optional fields render as dashes");
});

test("iterationsAndProject and productivity render their tables", () => {
  const text = iterationsAndProject(KPI(), {
    files: { total: 5 },
    lines: { total: 42 },
    components: 2,
    adrs: 1,
    testFiles: 1,
    bytes: { source: 100, nodeModules: 200, dist: 300 },
    tokensave: { present: true, dbBytes: 40 },
  }).join("\n");
  assert.match(text, /## Iterations/, "iterations open the section");
  assert.match(text, /## Project/, "the project table follows");
  assert.match(text, /present/, "a present code graph reports its size");
  assert.match(text, /read from the agent transcript/, "the not-estimated iteration source renders");

  const prod = productivitySection(KPI()).join("\n");
  assert.match(prod, /10/, "lines per prompt render");
  assert.match(prod, /12 ms/, "average per call renders");
});

test("routingTables renders only non-empty tables", () => {
  const both = routingTables(KPI()).join("\n");
  assert.match(both, /## Routed skills/, "the skills table renders");
  assert.match(both, /## Tools/, "the tools table renders");

  const none = routingTables({}).join("\n");
  assert.equal(none, "", "no routing means no tables");
});
