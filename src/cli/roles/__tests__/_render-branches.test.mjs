

/** Branch coverage for the role views: problems, deprecation and missing lists. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { renderList, renderRole, unknownRole } from "../_render.js";

test("the list prints the overlay files it skipped", () => {
  const text = renderList([], [{ file: "overlay.md", reason: "bad frontmatter" }]);

  assert.match(text, /Overlay files skipped:/u);
  assert.match(text, /overlay\.md: bad frontmatter/u);
});

test("a role with no list fields still renders every heading", () => {
  const text = renderRole({
    id: "rule-mcp",
    role: "Test Role",
    layer: "bundled",
    status: "active",
    version: "1.0.0",
    yearsOfExperience: 3,
  });

  assert.match(text, /Skills:/u);
  assert.match(text, /Lenses:/u);
  assert.match(text, /Evidence skills:/u);
  assert.doesNotMatch(text, /replaced by/u);
});

test("a deprecated role names its replacement", () => {
  const text = renderRole({
    id: "old",
    role: "Old Role",
    layer: "bundled",
    status: "deprecated",
    deprecatedBy: "new",
    version: "1.0.0",
    yearsOfExperience: 1,
    skills: ["a"],
    lenses: ["l"],
    evidenceSkills: ["e"],
  });

  assert.match(text, /replaced by new/u);
  assert.match(text, /- a/u);
});

test("an unknown role sets the failure exit code", () => {
  const previous = process.exitCode;

  unknownRole("missing", [{ id: "a" }, { id: "b" }]);

  assert.equal(process.exitCode, 1);
  process.exitCode = previous ?? 0;
});
