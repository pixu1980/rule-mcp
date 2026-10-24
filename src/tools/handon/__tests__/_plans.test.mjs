/** The next workstream each open plan proposes, and how handon reports it. */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { git, handon, write } from "./_handon.fixture.mjs";
import { nextPlanSteps } from "../_plans.js";
import "../../../../tests/fixtures/git-hermetic.mjs";

const HANDOFF = "docs/handoff/01-a-session.md";

const ALPHA = [
  "# alpha plan",
  "",
  "- **Role**: architect",
  "- **Date**: 2026-09-10",
  "",
  "Steps are re-derived on every run.",
  "",
  "## Workstream A",
  "",
  "- [x] **A.1**: done.",
  "- [ ] **A.2**: the first open step.",
  "- [ ] **A.3**: the second.",
  "",
].join("\n");

const ZETA = [
  "# zeta plan",
  "",
  "- **Role**: security",
  "- **Date**: 2026-09-15",
  "",
  "## Workstream Z",
  "",
  "- [ ] **Z.1**: a step that wraps onto the continuation line",
  "      and finishes here.",
  "",
].join("\n");

const ALL_DONE = ["# finished plan", "", "- **Date**: 2026-09-01", "", "## Workstream F", "", "- [x] **F.1**: done.", ""].join("\n");

const BACKLOG = ["# Backlog", "", "A queue with no checkboxes at all.", "", "## Done", "", "- **B-1** something shipped.", ""].join("\n");

/** A project whose plans cover every case: two open, one finished, one queue. */
function seededPlans() {
  const root = mkdtempSync(join(tmpdir(), "rule-handon-plans-"));

  write(root, "docs/plans/alpha.md", ALPHA);
  write(root, "docs/plans/zeta.md", ZETA);
  write(root, "docs/plans/finished.md", ALL_DONE);
  write(root, "docs/plans/backlog.md", BACKLOG);

  return root;
}

test("every plan with an open step is proposed, newest first", () => {
  const root = seededPlans();

  try {
    const plans = nextPlanSteps(root);

    assert.deepEqual(
      plans.map((plan) => plan.name),
      ["zeta", "alpha"],
      "only the plans with open steps, newest date first",
    );
    assert.equal(plans[0].workstream, "Workstream Z", "the heading owns the step");
    assert.equal(plans[0].step, "**Z.1**: a step that wraps onto the continuation line and finishes here.", "a wrapped step arrives whole");
    assert.equal(plans[1].workstream, "Workstream A", "the second plan keeps its own heading");
    assert.equal(plans[1].step, "**A.2**: the first open step.", "and proposes its first open step, not its second");
    assert.equal(plans[1].open, 2, "the remaining open count rides along");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a plan with nothing open and a queue with no checkboxes propose nothing", () => {
  const root = seededPlans();

  try {
    const names = new Set(nextPlanSteps(root).map((plan) => plan.name));

    assert.ok(!names.has("finished"), "a fully checked plan is not proposed");
    assert.ok(!names.has("backlog"), "a queue without checkboxes is not proposed");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("handon reports the proposal as pending confirmation", () => {
  const root = seededPlans();

  try {
    git(root, "init", "--initial-branch=main", "-q");
    git(root, "config", "user.email", "fixture@example.com");
    git(root, "config", "user.name", "Fixture");
    write(root, HANDOFF, ["# Handoff 01: a session", "", "**Branch:** `main` - **Date:** 2026-09-17", "", "## Next", "", "- [ ] something", ""].join("\n"));
    git(root, "add", "-A");
    git(root, "commit", "-qm", "chore(fixture): the seed");

    const { text } = handon({ projectDir: root });

    assert.match(text, /## Next from the plans/, "the section renders");
    assert.match(text, /confirm/i, "the wording says the user confirms before the work starts");
    assert.match(text, /zeta/, "the newest plan is named");
    assert.match(text, /Workstream Z/, "with its workstream");
    assert.match(text, /alpha/, "and so is the other open plan");
    assert.ok(text.indexOf("zeta") < text.indexOf("alpha"), "newest first");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a project with no plans renders no proposal section", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-handon-noplans-"));

  try {
    git(root, "init", "--initial-branch=main", "-q");
    git(root, "config", "user.email", "fixture@example.com");
    git(root, "config", "user.name", "Fixture");
    write(root, HANDOFF, ["# Handoff 01: a session", "", "**Branch:** `main` - **Date:** 2026-09-17", ""].join("\n"));
    git(root, "add", "-A");
    git(root, "commit", "-qm", "chore(fixture): the seed");

    const { text } = handon({ projectDir: root });

    assert.doesNotMatch(text, /Next from the plans/, "nothing to propose, nothing rendered");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
