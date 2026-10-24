

/** Branch coverage for selection presets, unknown values and hubs-only. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { ROUTER_COMMAND } from "../../../core/agents/commands/index.js";
import { resolveSelection } from "../_selection.js";

test("an unknown preset and family are reported as problems", () => {
  const { commands, problems } = resolveSelection({ preset: "nope", families: ["ghost"] });

  assert.ok(problems.some((line) => /unknown preset/u.test(line)));
  assert.ok(commands.includes(ROUTER_COMMAND), "the router is always written");
});

test("hubs-only drops leaf area commands but keeps the hub", () => {
  const { commands, problems } = resolveSelection({ families: ["areas"], hubsOnly: true });

  assert.deepEqual(problems, []);
  assert.ok(commands.includes(ROUTER_COMMAND));
  assert.ok(commands.some((name) => name.startsWith("rule-mcp-area-")));
  assert.ok(commands.every((name) => name === ROUTER_COMMAND || name.startsWith("rule-mcp-area-")));
});

test("a skill filter keeps matching leaves when hubsOnly is off", () => {
  const { commands } = resolveSelection({
    families: ["areas"],
    hubsOnly: false,
    skills: ["rule-mcp-frontend-react"],
  });

  assert.ok(commands.includes(ROUTER_COMMAND));
  assert.ok(commands.some((name) => name.includes("frontend") || name.startsWith("rule-mcp-area-")));
});

test("an unknown area and skill are reported", () => {
  const { problems } = resolveSelection({
    families: ["areas"],
    areas: ["no-such-area"],
    skills: ["rule-mcp-no-such-skill"],
  });

  assert.ok(problems.some((line) => /unknown area/u.test(line)));
  assert.ok(problems.some((line) => /unknown skill/u.test(line)));
});
