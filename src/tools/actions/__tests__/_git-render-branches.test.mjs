

/** Branch coverage for the git action renderers: every verdict shape. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { renderAudit, renderReword } from "../_git-render.js";
import { renderLinearize, renderSquash } from "../_git-render-rewrite.js";
test("renderSquash: applied wins and reports document and tree outcomes", () => {
  const consolidated = renderSquash({
    applied: true,
    message: "feat(x): y",
    verification: { commits: 2, documentsConsolidated: true, changed: ["a.md"], treeUnchanged: true, workingTree: "clean" },
  });
  assert.match(consolidated, /consolidated \(1 path\(s\)\)/u);
  assert.match(consolidated, /Final tree: {6}unchanged/u);

  const plain = renderSquash({
    applied: true,
    message: "feat(x): y",
    verification: { commits: 1, documentsConsolidated: false, changed: [], treeUnchanged: false, workingTree: "dirty" },
  });
  assert.match(plain, /Documents: {7}unchanged/u);
  assert.match(plain, /code unchanged, documents consolidated/u);
  assert.match(plain, /Working tree: {4}dirty/u);
});
test("renderSquash: the proposal covers range, commits, documents and safety", () => {
  const full = renderSquash({
    applied: false,
    reason: "confirmation required",
    proposal: {
      range: { baseBranch: "main", baseRef: "origin/main", mergeBase: "abc", range: "abc..HEAD", count: 2 },
      commits: [{ short: "abc", subject: "feat(x): a" }],
      documents: {
        actionable: true,
        consolidates: { adrs: true, handoffs: true },
        adrs: ["docs/adr/1.md"],
        adrTarget: "docs/adr/2.md",
        handoffs: ["h1"],
        handoffTarget: "h2",
        outside: ["x.md"],
      },
      safe: false,
      reasons: ["dirty"],
    },
    verdict: { valid: false, reason: "bad" },
  });
  assert.match(full, /main \(origin\/main\)/u);
  assert.match(full, /Feature commits: 2/u);
  assert.match(full, /no - bad/u);
  assert.match(full, /Commits being squashed/u);
  assert.match(full, /ADR: {5}docs\/adr\/1.md -> docs\/adr\/2.md/u);
  assert.match(full, /Handoff: h1 -> h2/u);
  assert.match(full, /Cited but outside/u);
  assert.match(full, /Working tree NOT safe - dirty/u);
});
test("renderSquash: a sparse proposal keeps the empty branches", () => {
  const sparse = renderSquash({
    applied: false,
    reason: "r",
    proposal: { range: {}, commits: [], documents: { actionable: false }, safe: true },
    verdict: {},
  });
  assert.match(sparse, /Base branch: {5}\(none\)/u);
  assert.match(sparse, /Feature commits: 0/u);
  assert.match(sparse, /Message valid: {3}no - not provided/u);
  assert.doesNotMatch(sparse, /Documents folded/u);
  assert.doesNotMatch(sparse, /NOT safe/u);

  const missing = renderSquash({ applied: false, reason: "r" });
  assert.match(missing, /Not applied: r/u);
  assert.doesNotMatch(missing, /Commits being squashed/u);
});
test("renderLinearize: applied, conflicts and output", () => {
  const applied = renderLinearize({ applied: true, verification: { commits: 1, merges: 2, treeUnchanged: true } });
  assert.match(applied, /Merge commits removed/u);
  assert.match(applied, /Final tree: {6}unchanged/u);

  const changed = renderLinearize({ applied: true, verification: { commits: 1, merges: 1, treeUnchanged: false } });
  assert.match(changed, /Final tree: {6}CHANGED/u);

  const conflict = renderLinearize({ applied: false, reason: "r", conflicted: true, conflicts: ["a"], output: "git said" });
  assert.match(conflict, /Conflicts/u);
  assert.match(conflict, /a/u);
  assert.match(conflict, /git said/u);

  const empty = renderLinearize({ applied: false, reason: "r", conflicted: true, conflicts: [] });
  assert.match(empty, /git listed none/u);

  const quiet = renderLinearize({ applied: false, reason: "r" });
  assert.doesNotMatch(quiet, /Conflicts/u);
  assert.doesNotMatch(quiet, /git said/u);
});
test("renderAudit: range, violations, merges, anomalies and force", () => {
  const full = renderAudit(
    {
      range: { baseBranch: "main", baseRef: "origin/main", mergeBase: "abc", range: "abc..HEAD", count: 2 },
      violations: [{ short: "a", subject: "bad", reason: "no type" }],
      merges: [{ short: "b", subject: "merge" }],
      safe: false,
      reasons: ["dirty"],
      anomalies: ["odd"],
    },
    true,
  );
  assert.match(full, /main \(origin\/main\)/u);
  assert.match(full, /CC violations:\s+1/u);
  assert.match(full, /no type/u);
  assert.match(full, /Merge commits:\s+1/u);
  assert.match(full, /NOT safe - dirty/u);
  assert.match(full, /Anomalies/u);
  assert.match(full, /force=true/u);

  const sparse = renderAudit({ range: {}, violations: [], merges: [], safe: true, reasons: [], anomalies: [] }, false);
  assert.match(sparse, /Base branch: {7}\(none\)/u);
  assert.match(sparse, /CC violations:\s+0/u);
  assert.match(sparse, /safe to rewrite/u);
  assert.doesNotMatch(sparse, /Anomalies/u);
  assert.doesNotMatch(sparse, /force=true/u);
});
test("renderReword: applied, entries and output", () => {
  const applied = renderReword({ applied: true, verification: { commits: 1, violations: 0, treeUnchanged: true } });
  assert.match(applied, /Reword applied/u);
  assert.match(applied, /Final tree: {6}unchanged/u);

  const changed = renderReword({ applied: true, verification: { commits: 1, violations: 1, treeUnchanged: false } });
  assert.match(changed, /CHANGED/u);

  const proposed = renderReword({
    applied: false,
    reason: "r",
    proposal: {
      entries: [
        { short: "a", from: "old", to: "new", valid: true },
        { short: "b", from: "old2", to: "new2", valid: false, reason: "bad" },
      ],
    },
    output: "git said",
  });
  assert.match(proposed, /OLD -> NEW/u);
  assert.match(proposed, /invalid: bad/u);
  assert.match(proposed, /git said/u);

  const empty = renderReword({ applied: false, reason: "r" });
  assert.doesNotMatch(empty, /Proposed/u);
  assert.doesNotMatch(empty, /git said/u);
});
