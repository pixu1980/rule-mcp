

/**
 * @module test/nyx-rerank
 *
 * The Nyx rerank is optional: when the adapter is disabled or absent it must
 * return null, leave the caller's order untouched, and count nothing.
 */

process.env.RULE_MCP_NO_NYX = "1";

import test from "node:test";
import assert from "node:assert/strict";
import { nyxShadowStats, rerankSkillScores } from "../_nyx-rerank.js";

const SKILL_SCORES = [
  { skill: "rule-alpha", relativeScore: 1, absoluteScore: 10, sections: ["A"], next_tools: ["rule_tool_search"] },
  { skill: "rule-beta", relativeScore: 0.5, absoluteScore: 5, sections: ["B"], next_tools: [] },
];

test("a disabled adapter leaves the order untouched", async () => {
  const result = await rerankSkillScores({ prompt: "anything", skillScores: SKILL_SCORES, ranked: new Map() });

  assert.equal(result, null);
  assert.deepEqual(nyxShadowStats(), { checks: 0, changes: 0 });
});

test("a single candidate is not worth a rerank", async () => {
  const result = await rerankSkillScores({ prompt: "anything", skillScores: SKILL_SCORES.slice(0, 1), ranked: new Map() });

  assert.equal(result, null);
  assert.deepEqual(nyxShadowStats(), { checks: 0, changes: 0 });
});

test("shadow mode stays inert while the adapter is disabled", async () => {
  process.env.RULE_MCP_NYX_SHADOW = "1";
  const result = await rerankSkillScores({ prompt: "anything", skillScores: SKILL_SCORES, ranked: new Map() });
  delete process.env.RULE_MCP_NYX_SHADOW;

  assert.equal(result, null);
  assert.deepEqual(nyxShadowStats(), { checks: 0, changes: 0 });
});
