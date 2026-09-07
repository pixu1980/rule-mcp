/** The outbound validators: result shape, output cap, and the anti-invention router check. */
import { strict as assert } from "node:assert";
import test from "node:test";

import { MAX_OUTPUT_BYTES, validateResultShape, validateRouterResult } from "../index.js";

const text = (value) => ({ content: [{ type: "text", text: value }] });

test("validateResultShape accepts a plain text result", () => {
  validateResultShape(text("fine"));
});

test("validateResultShape rejects every non-MCP shape", () => {
  for (const bad of [null, 42, {}, { content: [] }, { content: "x" }]) {
    assert.throws(() => validateResultShape(bad), /invalid MCP content/);
  }
});

test("validateResultShape rejects non-text and NUL-carrying content", () => {
  assert.throws(() => validateResultShape({ content: [{ type: "image", data: "x" }] }), /non-text/);
  assert.throws(() => validateResultShape({ content: [{ type: "text", text: 3 }] }), /non-text/);
  assert.throws(() => validateResultShape(text("a\0b")), /NUL/);
});

test("validateResultShape enforces the output cap across all parts", () => {
  const half = "x".repeat(Math.ceil(MAX_OUTPUT_BYTES / 2) + 1);

  assert.throws(
    () =>
      validateResultShape({
        content: [
          { type: "text", text: half },
          { type: "text", text: half },
        ],
      }),
    /exceeds/,
  );
});

const tools = new Set(["rule_tool_check"]);
const skills = new Set(["rule-frontend-react"]);
const answer = (routing) => text(JSON.stringify(routing));

test("validateRouterResult accepts a well-formed answer, none and unknown included", () => {
  for (const route of ["rule-frontend-react", "none", "unknown"]) {
    validateRouterResult(answer({ route, next_tools: ["rule_tool_check"], confidence: 0.8 }), tools, skills);
  }
});

test("validateRouterResult rejects invented skills, tools, alternatives and bad JSON", () => {
  assert.throws(() => validateRouterResult(text("{ not json"), tools, skills), /invalid JSON/);
  assert.throws(() => validateRouterResult(answer({ route: "rule-made-up", confidence: 0.5 }), tools, skills), /invented unknown skill/);
  assert.throws(() => validateRouterResult(answer({ route: "none", alternatives: [{ route: "rule-ghost" }], confidence: 0.5 }), tools, skills), /invented unknown skill/);
  assert.throws(() => validateRouterResult(answer({ route: "none", next_tools: ["rule_tool_ghost"], confidence: 0.5 }), tools, skills), /invented unknown tool/);
});

test("validateRouterResult rejects a confidence outside [0, 1]", () => {
  for (const confidence of [undefined, "high", -0.1, 1.1]) {
    assert.throws(() => validateRouterResult(answer({ route: "none", confidence }), tools, skills), /confidence/);
  }
});
