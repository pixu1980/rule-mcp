/** Branch coverage for the cache-call identity helpers. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { compare, depsFingerprint, describeCandidate, nonPromptArgs, rawRouteOf, routeOf } from "../_decision-identity.js";

test("nonPromptArgs drops undefined and prompt-shaped fields", () => {
  const args = JSON.parse(nonPromptArgs("rule_tool", { prompt: "find", limit: 3, projectDir: "/p" }));
  assert.equal(args.limit, 3);
  assert.equal(args.projectDir, "/p");
  assert.equal("prompt" in args, false);
  assert.deepEqual(JSON.parse(nonPromptArgs("rule_tool", { prompt: undefined, limit: 3 })), { limit: 3 });
  assert.deepEqual(JSON.parse(nonPromptArgs("unknown", { b: 1, a: 2 })), { a: 2, b: 1 });
});

test("depsFingerprint is stable and distinguishes deps", () => {
  assert.equal(depsFingerprint(), depsFingerprint({}));
  assert.match(depsFingerprint({ a: 1 }), /^[0-9a-f]{8}$/u);
  assert.notEqual(depsFingerprint({ a: 1 }), depsFingerprint({ a: 2 }));
});

test("describeCandidate redacts, truncates, and adds the route", () => {
  assert.equal(describeCandidate({ prompt: "x".repeat(300) }).length, "request: ".length + 160);
  assert.match(describeCandidate({ prompt: "p", route: "rule-frontend-react" }), /skill: rule-frontend-react/u);
  assert.match(describeCandidate({ prompt: "password=secret" }), /request:/u);
});

test("compare is a plain string order", () => {
  assert.equal(compare("a", "b"), -1);
  assert.equal(compare("b", "a"), 1);
  assert.equal(compare("a", "a"), 0);
  assert.equal(compare(null, ""), 0);
  assert.equal(compare(undefined, "a"), -1);
});

test("rawRouteOf and routeOf treat none as no candidate", () => {
  assert.equal(rawRouteOf({ content: [{ text: '{"route":"none"}' }] }), "none");
  assert.equal(routeOf({ content: [{ text: '{"route":"none"}' }] }), undefined);
  assert.equal(routeOf({ content: [{ text: '{"route":"billing"}' }] }), "billing");
  assert.equal(rawRouteOf({ content: [{ text: "not json" }] }), undefined);
  assert.equal(rawRouteOf({}), undefined);
  assert.equal(rawRouteOf({ content: [{ text: '{"route":1}' }] }), undefined);
});
