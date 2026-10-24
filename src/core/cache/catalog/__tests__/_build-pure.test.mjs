/**
 * The two rules that decide what a committed catalog may carry, and in what
 * order.
 *
 * `namesALocalPath` is a privacy gate: the catalog is committed, so a value
 * naming one machine is both useless to the next reader and a small leak of
 * whoever exported it. It recurses through arrays and objects, and only the
 * string arm was ever exercised.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { compareEntries, namesALocalPath } from "../_build.js";

test("a string that names a place on this machine is caught", () => {
  for (const value of ["/Users/dev/project", "/home/dev/project", "~/notes.md", "C:/Users/dev", String.raw`C:\Users\dev\project`, "/etc/hosts"]) {
    assert.equal(namesALocalPath(value), true, `${value} names a machine`);
  }
});

test("a string that names nothing local passes", () => {
  for (const value of ["react", "src/index.js", "rule-mcp-frontend-react", "https://example.com/a", ""]) {
    assert.equal(namesALocalPath(value), false, `${value} is portable`);
  }
});

test("the check recurses through arrays and objects, not just strings", () => {
  assert.equal(namesALocalPath(["react", "vue"]), false);
  assert.equal(namesALocalPath(["react", "/Users/dev"]), true, "one local path in a list is enough");
  assert.equal(namesALocalPath({ prompt: "react", path: "/home/dev" }), true);
  assert.equal(namesALocalPath({ nested: { deep: ["ok", "~/secret"] } }), true, "however deep it sits");
  assert.equal(namesALocalPath({ prompt: "react", framework: "vue" }), false);
});

test("a value that is neither string, array nor object names nothing", () => {
  for (const value of [undefined, null, 42, true, Symbol("x")]) {
    assert.equal(namesALocalPath(value), false);
  }
});

test("entries sort by tool, then by their arguments, so a diff shows a change", () => {
  const entries = [
    { tool: "rule_tool_search", args: { query: "b" } },
    { tool: "rule_tool", args: { prompt: "z" } },
    { tool: "rule_tool_search", args: { query: "a" } },
    { tool: "rule_tool", args: { prompt: "a" } },
  ];

  const sorted = [...entries].sort(compareEntries);

  assert.deepEqual(
    sorted.map((entry) => `${entry.tool}:${Object.values(entry.args)[0]}`),
    ["rule_tool:a", "rule_tool:z", "rule_tool_search:a", "rule_tool_search:b"],
  );
});

test("two entries of the same tool and arguments tie rather than reshuffle", () => {
  const entry = { tool: "rule_tool", args: { prompt: "same" } };

  assert.equal(compareEntries(entry, { ...entry }), 0);
});
