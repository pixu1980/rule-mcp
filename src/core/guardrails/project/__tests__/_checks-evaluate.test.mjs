

/**
 * @module test/guardrails/project/checks-evaluate
 *
 * What each project check calls a failure, given a payload.
 *
 * The adapter fetches and this decides, so a graph that answered oddly - a
 * missing field, a shape nobody expected, a cycle outside src - must produce
 * a pass or a described failure, never a throw. Every check is exercised
 * against both.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { HEALTH_FLOOR, PROJECT_CHECKS } from "../_checks.js";

const check = (id) => PROJECT_CHECKS.find((entry) => entry.id === id);

test("every check names a tool and an evaluate, and only diagnostics is optional", () => {
  for (const entry of PROJECT_CHECKS) {
    assert.match(entry.id, /^project-/, "ids are prefixed so a report can group them");
    assert.equal(typeof entry.tool, "string");
    assert.equal(typeof entry.evaluate, "function");
  }

  assert.deepEqual(
    PROJECT_CHECKS.filter((entry) => entry.optional).map((entry) => entry.id),
    ["project-diagnostics"],
    "a type checker may be absent; the rest are not",
  );
});

test("a graph that answered with nothing passes every check", () => {
  for (const entry of PROJECT_CHECKS) {
    if (entry.id === "project-health") {
      continue;
    }

    assert.equal(entry.evaluate(undefined), null, `${entry.id} passes on undefined`);
    assert.equal(entry.evaluate({}), null, `${entry.id} passes on an empty payload`);
  }
});

test("circular counts only the cycles that touch src", () => {
  const circular = check("project-circular");

  assert.equal(circular.evaluate({ cycles: [["lib/a.js", "lib/b.js"]] }), null, "a cycle outside src is not this rule's business");

  const failure = circular.evaluate({ cycles: [["lib/a.js"], ["src/a.js", "src/b.js", "src/a.js"]] });

  assert.equal(failure.failCount, 1, "only the src cycle counts");
  assert.match(failure.detail[1], /src\/a\.js -> src\/b\.js -> src\/a\.js/, "the first cycle is spelled out");
  assert.match(failure.suggestion, /tokensave_imports/);
});

test("circular tolerates a cycles field that is not a list", () => {
  assert.equal(check("project-circular").evaluate({ cycles: "not a list" }), null);
});

test("health passes at the floor and fails below it", () => {
  const health = check("project-health");

  assert.equal(health.evaluate({ quality_signal: HEALTH_FLOOR }), null, "at the floor is not below it");
  assert.equal(health.evaluate({ quality_signal: HEALTH_FLOOR + 1 }), null);

  const failure = health.evaluate({ quality_signal: HEALTH_FLOOR - 1 });

  assert.equal(failure.failCount, 1);
  assert.match(failure.detail[0], new RegExp(`below ${HEALTH_FLOOR}`));
});

test("health says so when the tool returned no score at all", () => {
  const failure = check("project-health").evaluate({});

  assert.equal(failure.detail[0], "the health tool returned no score", "a missing score is not a score of zero");
  assert.equal(check("project-health").evaluate({ quality_signal: "not a number" }).detail[0], "the health tool returned no score");
});

test("dead code reports the count it was given", () => {
  const dead = check("project-dead-code");

  assert.equal(dead.evaluate({ dead_code_count: 0 }), null);
  assert.equal(dead.evaluate({ dead_code_count: "not a number" }), null, "a count that is not one is treated as none");
  assert.equal(dead.evaluate({ dead_code_count: 3 }).failCount, 3);
});

test("unsafe patterns lists the kinds when the payload names them", () => {
  const unsafe = check("project-unsafe-patterns");

  assert.equal(unsafe.evaluate({ match_count: 0 }), null);

  const bare = unsafe.evaluate({ match_count: 2 });

  assert.equal(bare.detail.length, 1, "no kinds means no second line");

  const detailed = unsafe.evaluate({ match_count: 5, by_kind: { unwrap: 3, panic: 2 } });

  assert.equal(detailed.failCount, 5);
  assert.equal(detailed.detail[1], "unwrap: 3, panic: 2");
});

test("diagnostics reads either field name, and only counts errors", () => {
  const diagnostics = check("project-diagnostics");

  assert.equal(diagnostics.evaluate({ diagnostics: [] }), null);
  assert.equal(diagnostics.evaluate({ errors: [] }), null, "the other field name answers too");
  assert.equal(diagnostics.evaluate({ diagnostics: [{ level: "warning" }] }), null, "a warning is not an error");
  assert.equal(diagnostics.evaluate({ diagnostics: "not a list" }), null, "a shape nobody expected is not a failure");

  assert.equal(diagnostics.evaluate({ diagnostics: [{ level: "error" }, { level: "warning" }] }).failCount, 1);
  assert.equal(diagnostics.evaluate({ errors: [{}] }).failCount, 1, "an entry with no level is an error");
});
