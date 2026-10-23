

/** Deterministic cache-candidate extraction: stable args, deps and ranking. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { depsFingerprint, describeCandidate, nonPromptArgs } from "../_decision-candidates.js";
import { CANDIDATE_CAP, rankCandidates } from "../_decision-ranker.js";

test("non-prompt args are stable and exclude the prompt", () => {
  assert.equal(nonPromptArgs("pix_tool", { prompt: "x", framework: "react", path: "/repo" }), '{"framework":"react","path":"/repo"}');
  assert.equal(nonPromptArgs("pix_tool", { path: "/repo", prompt: "x", framework: "react" }), '{"framework":"react","path":"/repo"}');
  assert.equal(nonPromptArgs("pix_tool", { prompt: "x", framework: undefined }), "{}");
  assert.equal(nonPromptArgs("other", { query: "x" }), '{"query":"x"}');
});

test("the deps fingerprint is order-independent and content-sensitive", () => {
  assert.equal(depsFingerprint({ a: "1", b: "2" }), depsFingerprint({ b: "2", a: "1" }));
  assert.notEqual(depsFingerprint({ a: "1" }), depsFingerprint({ a: "2" }));
});

test("a candidate description carries the request, skill, deps and id but not hits", () => {
  const description = describeCandidate({
    key: "abcdef012345",
    prompt: "  create   a button ",
    route: "rule-frontend-react",
    deps: "abcd1234",
  });

  assert.equal(description, "request: create a button; skill: rule-frontend-react; deps: abcd1234; id: abcdef01");
  assert.ok(describeCandidate({ key: "k", prompt: "x".repeat(500) }).length <= 200);
});

test("ranking puts the closest prompt first, skips zero scores and caps", () => {
  const descriptors = [
    { key: "a", prompt: "create a react button component" },
    { key: "b", prompt: "deploy a docker container" },
    { key: "c", prompt: "create a react form component" },
    { key: "d", prompt: "write an adr" },
    { key: "e", prompt: "test a node server" },
    { key: "f", prompt: "create a react hook" },
    { key: "g", prompt: "react component testing" },
    { key: "h", prompt: "create a component in react" },
    { key: "i", prompt: "react button styles" },
  ];
  const ranked = rankCandidates("create a react component", descriptors);

  assert.equal(ranked.length, CANDIDATE_CAP);
  assert.equal(ranked[0].key, "a");
  assert.equal(
    ranked.every((entry) => entry.score > 0),
    true,
  );
  assert.equal(
    ranked.some((entry) => entry.key === "b" || entry.key === "d" || entry.key === "e"),
    false,
  );
});

test("an empty query or an empty candidate set ranks nothing", () => {
  assert.deepEqual(rankCandidates("", [{ key: "a", prompt: "x" }]), []);
  assert.deepEqual(rankCandidates("react", []), []);
});

test("ties break deterministically by prompt and key", () => {
  const ranked = rankCandidates("react", [
    { key: "b", prompt: "react" },
    { key: "a", prompt: "react" },
  ]);

  assert.deepEqual(
    ranked.map((entry) => entry.key),
    ["a", "b"],
  );
});

test("BM25 rewards a repeated query term without letting length win", () => {
  const ranked = rankCandidates("react button", [
    { key: "a", prompt: "react button" },
    { key: "b", prompt: "react button button" },
    { key: "c", prompt: "react button button button" },
  ]);

  assert.equal(ranked[0].key, "b");
});
