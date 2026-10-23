

/** The deterministic decision-cache protocol: redact, state, question, parse, guard. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { buildGateQuestion, buildGateState, decideShadow, guardCandidate, parseGateAnswer, promptHash, redact, SHADOW_THRESHOLD, truncate } from "../_decision-protocol.js";

const candidates = [
  { label: "candidate-1", description: "prompt: a; route: r", argsKey: "{}", echo: false, fresh: true, isError: false },
  { label: "candidate-2", description: "prompt: b; route: r", argsKey: "{}", echo: false, fresh: true, isError: false },
];

function answer(choice, probability) {
  return { answers: { pick: { choice, probabilities: { [choice]: probability } } } };
}

test("redaction removes home paths and obvious secrets", () => {
  const text = redact("open /Users/ada/project with sk-abcdefghijkl and password=hunter2");

  assert.equal(text.includes("/Users/ada"), false);
  assert.equal(text.includes("sk-abcdefghijkl"), false);
  assert.equal(text.includes("hunter2"), false);
  assert.match(text, /~/u);
  assert.equal(redact("/home/ada/p").includes("ada"), false);
  assert.equal(redact(String.raw`C:\Users\ada\p`).includes("ada"), false);
});

test("truncation collapses whitespace and caps the text", () => {
  assert.equal(truncate(" a   b ", 10), "a b");
  assert.equal(truncate("x".repeat(20), 10).length, 10);
});

test("the prompt hash is stable and does not expose the prompt", () => {
  assert.equal(promptHash("secret"), promptHash("secret"));
  assert.notEqual(promptHash("secret"), "secret");
});

test("the gate state carries the tool, query, context and candidate count", () => {
  const state = buildGateState({ toolName: "pix_tool", args: { prompt: "x", framework: "react", path: "/Users/ada/p" }, livePrompt: "x", candidates });

  assert.match(state, /^tool: pix_tool/u);
  assert.match(state, /query: x/u);
  assert.match(state, /queryHash: [a-f0-9]{12}/u);
  assert.match(state, /framework: react/u);
  assert.match(state, /path: ~\/p/u);
  assert.match(state, /candidates: 2/u);
});

test("the question offers the candidates plus none", () => {
  const question = buildGateQuestion(candidates);

  assert.deepEqual(Object.keys(question.pick.criteria), ["candidate-1", "candidate-2", "none"]);
  assert.match(question.pick.instructions, /cached result/u);
  assert.match(question.pick.instructions, /same skill/u);
});

test("a choice above the threshold is a replay candidate", () => {
  const parsed = parseGateAnswer(answer("candidate-1", 0.95), candidates);

  assert.equal(parsed.wouldReplay, true);
  assert.equal(parsed.candidate.label, "candidate-1");
  assert.equal(parsed.probability, 0.95);
});

test("none, unknown labels and low probabilities are misses", () => {
  assert.equal(parseGateAnswer(answer("none", 0.9), candidates).reason, "none");
  assert.equal(parseGateAnswer(answer("candidate-9", 0.9), candidates).reason, "unknown-label");
  assert.equal(parseGateAnswer(answer("candidate-1", 0.1), candidates).reason, "below-threshold");
  assert.equal(parseGateAnswer({ answers: {} }, candidates).reason, "no-choice");
});

test("a rerank result is parsed too", () => {
  const parsed = parseGateAnswer({ pick: "candidate-2", probability: 0.91 }, candidates);

  assert.equal(parsed.candidate.label, "candidate-2");
  assert.equal(parsed.probability, 0.91);
});

test("the hard guards veto mismatched args, echo, staleness and errors", () => {
  assert.equal(guardCandidate(candidates[0], { argsKey: "{}" }), null);
  assert.equal(guardCandidate({ ...candidates[0], argsKey: "x" }, { argsKey: "{}" }), "args-mismatch");
  assert.equal(guardCandidate({ ...candidates[0], echo: true }, { argsKey: "{}" }), "echo");
  assert.equal(guardCandidate({ ...candidates[0], fresh: false }, { argsKey: "{}" }), "stale");
  assert.equal(guardCandidate({ ...candidates[0], isError: true }, { argsKey: "{}" }), "error");
});

test("a guarded choice whose candidate echoes never replays", () => {
  const parsed = decideShadow({
    answer: answer("candidate-1", 0.95),
    candidates: [{ ...candidates[0], echo: true }],
    live: { argsKey: "{}" },
  });

  assert.equal(parsed.wouldReplay, false);
  assert.equal(parsed.reason, "echo");
});

test("the default threshold is explicit", () => {
  assert.equal(SHADOW_THRESHOLD, 0.9);
});
