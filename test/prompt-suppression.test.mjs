// test/prompt-suppression.test.mjs
//
// When RULE_MCP_NO_PROMPTS=1, the server must hide its MCP prompts so the
// clean /rule-* user commands don't duplicate them in hosts that namespace
// prompts (Claude: /rule-mcp:rule-handoff (MCP), VS Code:
// /mcp.rule-mcp.rule-handoff).
//
// listPrompts() stays pure (always the full registry); only listActivePrompts()
// honours the suppression flag - exactly how the server's prompt/list handler
// decides what to advertise.

import test from "node:test";
import assert from "node:assert/strict";

import { listPrompts, listActivePrompts, promptsSuppressed } from "../src/prompts/index.js";

test("listPrompts returns the full registry regardless of the flag", () => {
  assert.ok(listPrompts().length > 1, "full registry must not be empty");
});

test("listActivePrompts returns the full list when not suppressed", () => {
  delete process.env.RULE_MCP_NO_PROMPTS;
  const active = listActivePrompts();
  assert.equal(active.length, listPrompts().length, "active must equal full when not suppressed");
});

test("listActivePrompts returns empty when suppressed", () => {
  process.env.RULE_MCP_NO_PROMPTS = "1";
  assert.equal(listActivePrompts().length, 0, "suppressed must return no prompts");
  delete process.env.RULE_MCP_NO_PROMPTS;
});

test("promptsSuppressed reads the env variable", () => {
  delete process.env.RULE_MCP_NO_PROMPTS;
  assert.equal(promptsSuppressed(), false);
  process.env.RULE_MCP_NO_PROMPTS = "1";
  assert.equal(promptsSuppressed(), true);
  delete process.env.RULE_MCP_NO_PROMPTS;
});
