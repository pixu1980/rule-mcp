

/**
 * @module test/tokensave/routing
 *
 * Contract for the graph candidate source: map symbols back to the skills that
 * own them, and return nothing when the graph is absent or disabled.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { GRAPH_BONUS, graphCandidates, skillOfFile } from "../_routing.js";

test("skillOfFile maps only skills that resolve", () => {
  const skills = ["rule-frontend-react", "rule-styleguide-json"];

  assert.equal(skillOfFile("skills/rule-frontend-react/SKILL.md", skills), "rule-frontend-react");
  assert.equal(skillOfFile("skills/rule-frontend-react/examples/a.js", skills), "rule-frontend-react");
  assert.equal(skillOfFile("src/core/skills/__tests__/_ai.test.mjs", skills), null, "a path under src/ is not a skill");
  assert.equal(skillOfFile("skills/rule-nope/SKILL.md", skills), null, "an unknown skill is not a candidate");
  assert.equal(skillOfFile(null, skills), null);
});

test("graphCandidates returns nothing without a graph", () => {
  assert.equal(graphCandidates("/tmp/none", "react button", { probe: () => ({ available: false }) }).size, 0);
});

test("graphCandidates returns nothing when disabled", () => {
  process.env.RULE_MCP_NO_TOKENSAVE = "1";

  try {
    assert.equal(graphCandidates("/tmp/p", "react button", { probe: () => ({ available: true }) }).size, 0);
  } finally {
    delete process.env.RULE_MCP_NO_TOKENSAVE;
  }
});

test("graphCandidates folds search hits onto their skill", () => {
  const client = () => ({
    ok: true,
    value: [
      { file: "skills/rule-frontend-react/SKILL.md" },
      { file: "skills/rule-frontend-react/examples/a.js" },
      { file: "src/core/skills/__tests__/_ai.test.mjs" },
    ],
  });
  const result = graphCandidates("/tmp/p", "react button", { skills: ["rule-frontend-react"], probe: () => ({ available: true }), client });

  assert.equal(result.size, 1);
  assert.equal(result.get("rule-frontend-react"), GRAPH_BONUS);
});
