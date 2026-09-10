

/** The scripted repository: every stale claim gets the verdict it deserves. */
import test from "node:test";
import assert from "node:assert/strict";
import { fixture, report } from "./_handon.fixture.mjs";

test("it finds the newest handoff and names it", () => {
  assert.equal(report.source, fixture.handoff);
  assert.ok(report.text.includes("07-fixture-session.md"), "the report names its source");
});

test("a merged branch is reported as merged, not as current", () => {
  const branch = report.claims.find((claim) => claim.kind === "branch" && claim.value === "feat/merged");
  assert.ok(branch, "the branch claim was parsed");
  assert.equal(branch.verdict, "merged into main");
});

test("a branch that never existed is gone, not an error", () => {
  const branch = report.claims.find((claim) => claim.value === "feat/never-existed");
  assert.ok(branch, "the second branch was parsed");
  assert.equal(branch.verdict, "gone");
});

test("a range that ends at HEAD says the number counts the range too", () => {
  // The fixture handoff writes `<sha>..HEAD`, and where HEAD pointed when it
  // was written is not recorded anywhere. Counting from the start is the only
  // thing possible, so the verdict says that is what it counted: reported as
  // "commits since" it read as work that landed after the handoff, and it was
  // the size of the handoff's own range plus that work.
  const range = report.claims.find((claim) => claim.kind === "range");
  assert.ok(range, "the range was parsed");
  assert.match(range.verdict, /^\d+ commits in and since the range/);
  assert.match(range.verdict, /HEAD/, "and why: the range has no fixed end");
  assert.ok(Number.parseInt(range.verdict, 10) >= 3, `expected at least 3 commits, got ${range.verdict}`);
});

test("each file in flight gets its own verdict", () => {
  const verdictFor = (path) => report.claims.find((claim) => claim.kind === "file" && claim.value === path)?.verdict;
  assert.equal(verdictFor("src/keep.js"), "unchanged");
  assert.equal(verdictFor("src/gone.js"), "deleted");
  assert.equal(verdictFor("src/touched.js"), "modified since");
});

test("an ADR that landed after the handoff is reported as accepted", () => {
  const adr = report.claims.find((claim) => claim.kind === "adr" && claim.value === "041");
  assert.ok(adr, "the ADR reference was parsed");
  assert.equal(adr.verdict, "accepted");
});

test("open checklist items are carried over as human judgment", () => {
  const open = report.claims.filter((claim) => claim.kind === "open");
  assert.equal(open.length, 2, "the checked item is not open work");
  assert.equal(open[0].verdict, "unverified, human judgment");
  assert.ok(open[0].value.includes("cacheKey"));
});

test("a claimed command is reported as claimed, never re-run", () => {
  const command = report.claims.find((claim) => claim.kind === "command");
  assert.ok(command, "the command claim was parsed");
  assert.match(command.verdict, /not re-verified/);
  assert.ok(command.value.includes("pnpm run ci"));
});
