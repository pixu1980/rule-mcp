

/** Range claims: fixed ends, open ends, and ends that no longer exist. */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { git, handon, write } from "./_handon.fixture.mjs";
import "../../../../tests/fixtures/git-hermetic.mjs";

test("a range with a fixed end counts only what landed after it", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-handon-fixed-"));
  mkdirSync(join(root, "docs", "handoff"), { recursive: true });
  mkdirSync(join(root, "docs", "adr"), { recursive: true });
  git(root, "init", "-q");
  git(root, "config", "user.email", "fixture@example.com");
  git(root, "config", "user.name", "Fixture");
  write(root, "src/one.js", "export const one = 1;\n");
  git(root, "add", "-A");
  git(root, "commit", "-qm", "feat(one): the first");
  const start = git(root, "rev-parse", "HEAD");
  write(root, "src/two.js", "export const two = 2;\n");
  git(root, "add", "-A");
  git(root, "commit", "-qm", "feat(two): inside the range");
  const end = git(root, "rev-parse", "HEAD");

  write(
    root,
    "docs/handoff/01-fixed.md",
    [
      "# Handoff 01: a range with both ends",
      "",
      "- **Branch**: `main`",
      `- **Covers**: \`${start.slice(0, 7)}..${end.slice(0, 7)}\``,
      "- **Date**: 2026-09-04",
      "",
      "## Next, in order of leverage",
      "",
      "1. Nothing yet.",
      "",
    ].join("\n"),
  );
  git(root, "add", "-A");
  git(root, "commit", "-qm", "docs(handoff): the fixed-range fixture");
  write(root, "src/three.js", "export const three = 3;\n");
  git(root, "add", "-A");
  git(root, "commit", "-qm", "feat(three): after the range");

  const range = handon({ projectDir: root }).claims.find((claim) => claim.kind === "range");

  assert.equal(range.verdict, "2 commits since the range ended", "the two commits after the end, not the four total");
  rmSync(root, { recursive: true, force: true });
});

test("an end this repository cannot find is not reported as HEAD", () => {
  // After a message rewrite the shas move, and a handoff that names the old one
  // is naming a commit that no longer exists. Falling back to counting from the
  // start is right; calling that range "ends at HEAD" is not, because it says
  // the handoff was written open-ended when it named an end that went away.
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-handon-lost-"));
  mkdirSync(join(root, "docs", "handoff"), { recursive: true });
  mkdirSync(join(root, "docs", "adr"), { recursive: true });
  git(root, "init", "-q");
  git(root, "config", "user.email", "fixture@example.com");
  git(root, "config", "user.name", "Fixture");
  write(root, "src/one.js", "export const one = 1;\n");
  git(root, "add", "-A");
  git(root, "commit", "-qm", "feat(one): the first");
  const start = git(root, "rev-parse", "HEAD");

  write(
    root,
    "docs/handoff/01-lost-end.md",
    [
      "# Handoff 01: an end that went away",
      "",
      "- **Branch**: `main`",
      `- **Covers**: \`${start.slice(0, 7)}..deadbee\``,
      "- **Date**: 2026-09-04",
      "",
      "## Next, in order of leverage",
      "",
      "1. Nothing yet.",
      "",
    ].join("\n"),
  );
  git(root, "add", "-A");
  git(root, "commit", "-qm", "docs(handoff): the fixture");

  const range = handon({ projectDir: root }).claims.find((claim) => claim.kind === "range");

  assert.match(range.verdict, /^\d+ commits in and since the range/, "counting from the start is the only option");
  assert.doesNotMatch(range.verdict, /ends at HEAD/, "the handoff named an end; it is gone, which is a different fact");
  assert.match(range.verdict, /end .*(gone|not in this repository)/i, "and the report says which");
  rmSync(root, { recursive: true, force: true });
});
