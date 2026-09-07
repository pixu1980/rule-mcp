/** BM25 scoring paths on a hand-built index: misses, covers, per-skill rollup. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { setIndex } from "../_state.js";
import { search, searchSkills } from "../_score.js";

/** A tiny index over three pretend skills. */
function seedIndex() {
  const docs = [
    { id: 0, skill: "rule-frontend-react", section: "flex", snippet: "flex layout" },
    { id: 1, skill: "rule-frontend-react", section: "grid", snippet: "grid layout" },
    { id: 2, skill: "rule-backend-node", section: "io", snippet: "file io" },
  ];
  setIndex({
    df: new Map([
      ["flex", new Map([[0, 1]])],
      ["grid", new Map([[1, 1]])],
      ["io", new Map([[2, 2]])],
    ]),
    docLength: new Map([...docs.map((d) => [d.id, 10])]),
    docs,
    totalDocs: docs.length,
    avgDocLength: 10,
  });
}

test("search returns nothing without an index or with empty terms", () => {
  setIndex(null);
  assert.deepEqual(search("anything"), [], "no index means no results");

  seedIndex();
  assert.deepEqual(search(""), [], "empty query means no results");
});

test("search ranks matching sections and ignores unknown terms", () => {
  const results = search("flex io", 10);
  assert.ok(results.length >= 2, "the matching sections rank");
  const flex = results.find((entry) => entry.section === "flex");
  const io = results.find((entry) => entry.section === "io");
  assert.ok(flex.score > 0, "a matching section scores");
  assert.ok(io.score > flex.score, "a rarer term with more frequency scores higher");
});

test("searchSkills rolls sections per skill and drops zero-coverage skills", () => {
  const skills = searchSkills("flex grid", { maxSections: 10 });
  assert.equal(skills.length, 1, "only the react skill covers both terms");
  assert.equal(skills[0].skill, "rule-frontend-react", "the covering skill wins");
  assert.ok(skills[0].sections.length >= 2, "both sections are listed");
});

test("searchSkills returns nothing when search is empty", () => {
  assert.deepEqual(searchSkills("zzz-not-a-term-xyz"), [], "no matches means no skills");
});
