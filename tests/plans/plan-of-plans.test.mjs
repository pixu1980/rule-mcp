/**
 * @module test/plans/plan-of-plans
 *
 * The level-0 orchestrator on `feat/evolution` owns branches it does not check
 * out, so the contract of ADR 154 can only be verified through `git show`.
 * This is the stage 2 gate: the four plan paths `feat/export` and `feat/nyx`
 * carry, read from the branch that carries them.
 *
 * Stage 7 widens the scope branch by branch. `feat/guardrails` keeps its own
 * `tests/plans/skills-plan.test.mjs` for the catalogue it holds locally: a plan
 * inside its branch carries four lines, one that must be found from another
 * branch adds `Branch:` and `Path:` (ADR 154, amendment of 2026-10-21).
 */
import { strict as assert } from "node:assert";
import test from "node:test";

import { BRANCHES, REFS, TEXT, edgeSection, files, formatOffenders, git, graph, instances, levelEdges, line, mergeEdges, read, section, stageOf } from "./_cross-branch.mjs";

const RETIRED = new Set(["docs/plans/execution-plan.md", "docs/plans/oss.md"]);

test("every plan on the retrofitted branches carries the format", () => {
  const offenders = formatOffenders();

  assert.deepEqual(offenders, [], `retrofit these plans: ${offenders.slice(0, 12).join("; ")}`);
});

test("a plan carried by one branch declares the branch and path to find it", () => {
  const unique = instances.filter(({ path }) => !RETIRED.has(path) && Object.values(files).filter((paths) => paths.includes(path)).length === 1);

  assert.deepEqual(
    unique.map(({ path }) => path).sort(),
    ["docs/plans/2026-10-01-scripts-mcp-layout.md", "docs/plans/export.md"],
    "the branches carry a different set of unique plans than stage 2 measured",
  );

  for (const { alias, path } of unique) {
    const body = graph(read(alias, path));

    assert.equal(line(body, "Branch:"), BRANCHES[alias], `${path}: Branch:`);
    assert.equal(line(body, "Path:"), path, `${path}: Path:`);
    git("cat-file", "-e", `${REFS[alias]}:${line(body, "Path:")}`);
  }
});

test("section 2 names the two plans and the branch that carries them", () => {
  const rows = [...section(TEXT, "## 2 - What this file is not").matchAll(/^\| `(ex|nyx)`[^|]*\| `([^`]+\.md)`/gm)];

  assert.equal(rows.length, 2, "section 2 no longer maps one plan per retrofitted branch");

  for (const [, alias, path] of rows) {
    assert.ok(files[alias].includes(path), `${path} is not on ${BRANCHES[alias]}`);

    const body = graph(read(alias, path));

    assert.equal(line(body, "Branch:"), BRANCHES[alias], `${path}: Branch:`);
    assert.equal(line(body, "Path:"), path, `${path}: Path:`);
  }
});

test("a path claimed by two branches is reconciled in section 5", () => {
  const shared = instances.filter(({ path }) => files.ex.includes(path) && files.nyx.includes(path)).map(({ path }) => path);

  assert.deepEqual(shared, [], "the two branches share a different set of plan paths");

  for (const path of shared) {
    const row = edgeSection.split("\n").find((candidate) => candidate.includes(path) && /DIVERGENCE|SUPERSEDES/.test(candidate));

    assert.ok(row, `${path} is on both branches and section 5 does not reconcile it`);
  }
});

test("the level-1 graph is acyclic", () => {
  const edges = levelEdges();
  const adjacency = new Map();

  assert.ok(edges.length >= 4, "section 5 no longer spells out the level-1 edges");

  for (const { from, to } of edges) {
    adjacency.set(from, [...(adjacency.get(from) ?? []), to]);
  }

  const state = new Map();
  const visit = (node, path) => {
    if (state.get(node) === "done") {
      return;
    }

    assert.notEqual(state.get(node), "open", `dependency cycle through: ${[...path, node].join(" -> ")}`);
    state.set(node, "open");

    for (const next of adjacency.get(node) ?? []) {
      visit(next, [...path, node]);
    }

    state.set(node, "done");
  };

  for (const from of adjacency.keys()) {
    visit(from, []);
  }
});

test("the merge stages agree with the MERGE and REBASE edges", () => {
  const edges = mergeEdges();

  assert.ok(edges.length >= 4, "section 5 no longer declares the merge and rebase edges");

  for (const { source, target } of edges) {
    const from = stageOf(source);

    assert.ok(from !== null, `${source} has no stage in section 7`);

    if (target === "feat/evolution") {
      continue;
    }

    const to = stageOf(target);

    assert.ok(to !== null, `${target} has no stage in section 7`);
    assert.ok(from < to, `${source} is stage ${from}, ${target} is stage ${to}, but ${source} must go first`);
  }
});

test("a plan marked done has no open step", () => {
  for (const { alias, path } of instances) {
    const text = read(alias, path);

    if (/^Status:\s*`?done`?/m.test(text)) {
      assert.equal([...text.matchAll(/^- \[ \]/gm)].length, 0, `${path} is done with an open step`);
    }
  }
});
