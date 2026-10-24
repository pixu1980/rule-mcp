

/**
 * Guardrail composition by inheritance (ADR 089): a skill declares the rules
 * it owns and the skills it takes rules from, and the nearest definition of an
 * id wins.
 *
 * The resolver is handed a lookup rather than a directory, so the rules it
 * implements are testable without a filesystem.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { resolveInherited } from "../_inherit.js";

/** A lookup over a plain { skillName: { inherits, guardrails } } map. */
const lookupOver = (graph) => (name) => graph[name];

/** Just the ids of the resolved rules, in order. */
const ids = (resolved) => resolved.guardrails.map((rule) => rule.id);

test("a skill with no inheritance resolves to its own rules", () => {
  const graph = { "rule-mcp-devops-docker": { guardrails: [{ id: "docker-non-root" }, { id: "docker-healthcheck" }] } };

  assert.deepEqual(ids(resolveInherited("rule-mcp-devops-docker", lookupOver(graph))), ["docker-non-root", "docker-healthcheck"]);
});

test("a child takes its parent's rules, parent first", () => {
  const graph = {
    "rule-mcp-backend": { guardrails: [{ id: "cors-explicit" }, { id: "sql-injection" }] },
    "rule-mcp-backend-express": { inherits: ["rule-mcp-backend"], guardrails: [{ id: "express-async-errors" }] },
  };

  assert.deepEqual(
    ids(resolveInherited("rule-mcp-backend-express", lookupOver(graph))),
    ["cors-explicit", "sql-injection", "express-async-errors"],
    "inherited rules come first, so the skill's own can override them",
  );
});

test("the child's definition of an id wins over the one it inherits", () => {
  const graph = {
    "rule-mcp-backend": { guardrails: [{ id: "cors-explicit", label: "parent" }] },
    "rule-mcp-backend-express": { inherits: ["rule-mcp-backend"], guardrails: [{ id: "cors-explicit", label: "child" }] },
  };

  const resolved = resolveInherited("rule-mcp-backend-express", lookupOver(graph));

  assert.deepEqual(ids(resolved), ["cors-explicit"], "the rule runs once");
  assert.equal(resolved.guardrails[0].label, "child", "and it is the nearest definition that runs");
});

test("inheriting the same skill twice runs its rules once", () => {
  const graph = {
    base: { guardrails: [{ id: "shared-rule" }] },
    left: { inherits: ["base"], guardrails: [{ id: "left-rule" }] },
    right: { inherits: ["base"], guardrails: [{ id: "right-rule" }] },
    leaf: { inherits: ["left", "right"] },
  };

  assert.deepEqual(ids(resolveInherited("leaf", lookupOver(graph))), ["shared-rule", "left-rule", "right-rule"], "a diamond resolves to one copy of the shared rule");
});

test("a cycle is reported and does not hang", () => {
  const graph = {
    a: { inherits: ["b"], guardrails: [{ id: "a-rule" }] },
    b: { inherits: ["a"], guardrails: [{ id: "b-rule" }] },
  };

  const resolved = resolveInherited("a", lookupOver(graph));

  assert.deepEqual(ids(resolved).sort(), ["a-rule", "b-rule"], "both skills still contribute their rules");
  assert.equal(resolved.problems.length, 1, "and the cycle is reported once");
  assert.match(resolved.problems[0].reason, /cycle/i);
  assert.match(resolved.problems[0].reason, /a/, "the report names the skills involved");
});

test("a parent that does not exist is reported, and the rest still resolves", () => {
  const graph = { child: { inherits: ["gone", "present"], guardrails: [{ id: "own-rule" }] }, present: { guardrails: [{ id: "present-rule" }] } };

  const resolved = resolveInherited("child", lookupOver(graph));

  assert.deepEqual(ids(resolved), ["present-rule", "own-rule"], "the parent that exists still contributes");
  assert.equal(resolved.problems.length, 1);
  assert.match(resolved.problems[0].reason, /gone/, "the missing parent is named");
});

test("resolving a skill that does not exist is a problem, not a throw", () => {
  const resolved = resolveInherited("nowhere", lookupOver({}));

  assert.deepEqual(resolved.guardrails, []);
  assert.equal(resolved.problems.length, 1);
  assert.match(resolved.problems[0].reason, /nowhere/);
});

test("the chain the rules came from is reported, for attribution", () => {
  const graph = {
    "rule-mcp-backend": { guardrails: [{ id: "cors-explicit" }] },
    "rule-mcp-backend-express": { inherits: ["rule-mcp-backend"], guardrails: [{ id: "express-async-errors" }] },
  };

  const resolved = resolveInherited("rule-mcp-backend-express", lookupOver(graph));

  assert.deepEqual(resolved.chain, ["rule-mcp-backend", "rule-mcp-backend-express"], "a rule nobody can attribute is a rule nobody can debug");
});

test("depth is bounded, so a pathological graph cannot exhaust the stack", () => {
  const graph = {};

  for (let index = 0; index < 200; index++) {
    graph[`s${index}`] = { inherits: index === 199 ? [] : [`s${index + 1}`], guardrails: [{ id: `rule-${index}` }] };
  }

  const resolved = resolveInherited("s0", lookupOver(graph));

  assert.ok(
    resolved.problems.some((problem) => /depth/i.test(problem.reason)),
    `expected a depth problem: ${JSON.stringify(resolved.problems)}`,
  );
  assert.ok(resolved.guardrails.length > 0, "and what it did resolve is still returned");
});
