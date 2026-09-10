

/** The report itself: shape, size, read-only behavior and file selection. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fixture, handon, report, snapshot, write } from "./_handon.fixture.mjs";

test("the report separates what holds from what changed", () => {
  for (const heading of ["## Still true", "## Changed since", "## Unverified", "## Next"]) {
    assert.ok(report.text.includes(heading), `the report must carry ${heading}`);
  }
});

test("the report is smaller than the handoff it read", () => {
  const source = readFileSync(join(fixture.root, fixture.handoff), "utf8");
  assert.ok(report.text.length < source.length, `report ${report.text.length} chars vs handoff ${source.length}`);
});

test("and a fraction of a full-length one, not a trim", () => {
  // This used to read `docs/handoff/` in this repository, which made it depend
  // on that directory being non-empty. Handoffs are working files now (ADR 066)
  // and it is empty between sessions, so the length claim gets its own handoff
  // at a realistic size: the small shared fixture cannot show a ratio, only a
  // difference, and the difference is the test above.
  const long = `# Handoff 09: a full-length session

**Branch:** \`main\` - **Range:** \`HEAD~3..HEAD\` - **Date:** 2026-09-01

${"Narrative a resuming reader already lived through, which is most of what a handoff is made of and most of what a verified report drops. ".repeat(20)}

## Files
- \`src/keep.js\`
- \`src/gone.js\`

## Decisions
- ADR 041 is pending.

## Next
- [ ] finish it
`;
  write(fixture.root, "docs/handoff/09-long.md", long);
  const verified = handon({ projectDir: fixture.root, file: "docs/handoff/09-long.md" });
  rmSync(join(fixture.root, "docs/handoff/09-long.md"));

  assert.ok(verified.text.length < long.length / 2, `report ${verified.text.length} chars vs handoff ${long.length}: a handon should be a fraction, not a trim`);
  console.log(`  handoff ${long.length} chars -> report ${verified.text.length}`);
});

test("a file path is not mistaken for a branch, and a glob is not a file", () => {
  const own = handon({ projectDir: "." });
  const branches = own.claims.filter((claim) => claim.kind === "branch").map((claim) => claim.value);
  assert.ok(
    branches.every((value) => !value.endsWith(".mjs") && !value.endsWith(".js")),
    `a test file was parsed as a branch: ${branches.join(", ")}`,
  );
  const files = own.claims.filter((claim) => claim.kind === "file").map((claim) => claim.value);
  assert.ok(
    files.every((value) => !value.includes("*")),
    `a glob was verified as a path: ${files.join(", ")}`,
  );
});

test("nothing on disk moves", () => {
  const before = snapshot(fixture.root);
  handon({ projectDir: fixture.root });
  assert.equal(snapshot(fixture.root), before, "handon wrote to the working tree");
});

test("--list names every handoff without verifying any", () => {
  const listed = handon({ projectDir: fixture.root, list: true });
  assert.ok(listed.text.includes("07-fixture-session.md"));
  assert.equal(listed.claims.length, 0, "listing verifies nothing");
});

test("a chosen file overrides the newest", () => {
  write(fixture.root, "docs/handoff/02-older.md", "# Handoff 02: older\n\n**Branch:** `main`\n");
  const chosen = handon({ projectDir: fixture.root, file: "docs/handoff/02-older.md" });
  assert.equal(chosen.source, "docs/handoff/02-older.md");
  rmSync(join(fixture.root, "docs/handoff/02-older.md"));
});

test("a malformed handoff reports what parsed and what did not", () => {
  write(fixture.root, "docs/handoff/99-malformed.md", "# Notes\n\nSome prose with no branch, no range, no paths.\n");
  const partial = handon({ projectDir: fixture.root, file: "docs/handoff/99-malformed.md" });
  assert.ok(partial.text.includes("Could not parse"), "the report says what it failed to find");
  assert.ok(partial.text.includes("branch"), "and names the missing claim");
  rmSync(join(fixture.root, "docs/handoff/99-malformed.md"));
});

// ── Tool registration and cache placement ───────────────────────────
//
// The last two suite checks - "the MCP tool is registered" and "it is never
// served from cache" - move with the MCP surface phase, where
// registerProcessHandonTool() wires `rule_tool_process_handon` into the router
// and handon joins the cache denylist. Until then the core verification
// (handon(), the fixture claims, read-only behavior) is what this suite pins.
