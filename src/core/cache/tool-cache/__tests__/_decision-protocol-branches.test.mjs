

/** Branch coverage for the decision-cache protocol's redaction, state and parse arms. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { buildGateQuestion, buildGateState, decideShadow, parseGateAnswer, promptHash, redact, truncate } from "../_decision-protocol.js";

test("redact strips home paths and credentials", () => {
  assert.equal(redact("/Users/alice/project"), "~/project");
  assert.match(redact(String.raw`C:\Users\alice\project`), /^~/u);
  assert.match(redact("sk-abcdefghijkl"), /\[redacted\]/u);
  assert.match(redact("password=hunter2"), /password=\[redacted\]/u);
});

test("truncate and promptHash are stable", () => {
  assert.equal(truncate("a  b\nc", 10), "a b c");
  assert.equal(truncate("abcdef", 5), "ab...");
  assert.equal(promptHash("x"), promptHash("x"));
  assert.equal(promptHash("x").length, 12);
});

test("buildGateState caps the context and the whole state", () => {
  const state = buildGateState({ toolName: "pix_tool", args: { prompt: "p", projectDir: "/p", extra: "x".repeat(200) }, livePrompt: "q", candidates: [{}, {}] });

  assert.match(state, /tool: pix_tool/u);
  assert.match(state, /projectDir: \/p/u);
  assert.match(state, /candidates: 2/u);
  const many = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`key${i}`, "x".repeat(120)]));
  assert.equal(buildGateState({ toolName: "t", args: many, livePrompt: "q", candidates: [] }).length, 600);
});

test("buildGateQuestion appends the none option", () => {
  assert.match(JSON.stringify(buildGateQuestion([{ label: "a", description: "A" }])), /none/u);
});

test("parseGateAnswer covers no-choice, none, unknown, below and candidate", () => {
  const candidates = [{ label: "a" }];

  assert.equal(parseGateAnswer({}, candidates).reason, "no-choice");
  assert.equal(parseGateAnswer({ answers: { pick: { choice: "none" } } }, candidates).reason, "none");
  assert.equal(parseGateAnswer({ answers: { pick: "b" } }, candidates).reason, "unknown-label");
  assert.equal(parseGateAnswer({ answers: { pick: "a" }, probability: 0.1 }, candidates).reason, "below-threshold");
  assert.equal(parseGateAnswer({ answers: { pick: "a" }, probability: 0.9 }, candidates).reason, "candidate");
});

test("decideShadow applies the candidate guard", () => {
  const candidates = [{ label: "a", prompt: "p" }];
  const result = decideShadow({ answer: { answers: { pick: "a" }, probability: 0.9 }, candidates, live: { prompt: "q" } });

  assert.equal(result.guard, "stale");
  assert.equal(result.wouldReplay, false);
});
