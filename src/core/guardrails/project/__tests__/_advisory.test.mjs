/**
 * An advisory project check reports and never fails.
 *
 * The graph sees a shape - an unused import, two identical bodies - and a person
 * decides whether the shape is the defect. Counting it as a failure would make
 * `rule_tool_check` red on healthy code, which is how a check teaches people to
 * stop reading its output.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { checkProjectGuarded } from "../_run.js";

const available = () => ({ available: true });

/** A client that answers each tool with the payload the test wants. */
const clientFor = (payloads) => (tool) => ({ ok: true, value: payloads[tool] ?? {} });

test("an advisory finding is reported without failing the run", () => {
  const result = checkProjectGuarded("/tmp/x", {
    probe: available,
    client: clientFor({
      circular: { cycles: [] },
      health: { quality_signal: 9000 },
      dead_code: { dead_code_count: 0 },
      unsafe_patterns: { match_count: 0 },
      unused_imports: { unused_import_count: 2, imports: [{ file: "src/a.js", line: 3, unused: "x" }] },
      redundancy: { pairs: [] },
    }),
  });

  assert.equal(result.allPass, true, "an advisory never blocks");
  assert.equal(result.failCount, 0);
  assert.equal(result.advisoryCount, 1);
  assert.equal(result.advisory[0].id, "project-unused-imports");
  assert.match(result.summary, /advisory/i, "the summary says the findings are advisory");
});

test("an advisory check that passes is counted as a pass", () => {
  const result = checkProjectGuarded("/tmp/x", {
    probe: available,
    client: clientFor({
      circular: { cycles: [] },
      health: { quality_signal: 9000 },
      dead_code: { dead_code_count: 0 },
      unsafe_patterns: { match_count: 0 },
      unused_imports: { unused_import_count: 0, imports: [] },
      redundancy: { pairs: [] },
    }),
  });

  assert.equal(result.advisoryCount, 0);
  assert.ok(result.passed.some((entry) => entry.id === "project-unused-imports"));
});

test("a blocking check still fails the run beside an advisory", () => {
  const result = checkProjectGuarded("/tmp/x", {
    probe: available,
    client: clientFor({
      circular: { cycles: [["src/a.js", "src/b.js"]] },
      health: { quality_signal: 9000 },
      dead_code: { dead_code_count: 0 },
      unsafe_patterns: { match_count: 0 },
      unused_imports: { unused_import_count: 1, imports: [{ file: "src/a.js", line: 1, unused: "x" }] },
      redundancy: { pairs: [] },
    }),
  });

  assert.equal(result.allPass, false);
  assert.equal(result.failCount, 1);
  assert.equal(result.advisoryCount, 1);
});

test("two identical bodies are an advisory, named with both sites", () => {
  const result = checkProjectGuarded("/tmp/x", {
    probe: available,
    client: clientFor({
      circular: { cycles: [] },
      health: { quality_signal: 9000 },
      dead_code: { dead_code_count: 0 },
      unsafe_patterns: { match_count: 0 },
      unused_imports: { unused_import_count: 0, imports: [] },
      redundancy: {
        pairs: [
          { similarity: 0.99, severity: "definite", a: { file: "src/a.js", line: 1 }, b: { file: "src/b.js", line: 9 } },
          { similarity: 0.7, severity: "naming_only", a: { file: "src/c.js", line: 1 }, b: { file: "src/d.js", line: 2 } },
        ],
      },
    }),
  });

  assert.equal(result.advisoryCount, 1);
  assert.equal(result.advisory[0].id, "project-duplicate-bodies");
  assert.equal(result.advisory[0].failCount, 1, "a naming-only pair is not a duplicate body");
  assert.match(result.advisory[0].detail.join(" "), /src\/a\.js:1 and src\/b\.js:9/);
});
