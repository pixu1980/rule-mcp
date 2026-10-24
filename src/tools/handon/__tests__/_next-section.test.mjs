

/** A numbered "Next, in order of leverage" section is the open items. */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { git, handon, write } from "./_handon.fixture.mjs";
import "../../../../tests/fixtures/git-hermetic.mjs";

test("a numbered Next section is read as the open items", () => {
  // Every handoff this repository has written puts its open work under a
  // "Next, in order of leverage" heading as an ordered list. Only unchecked
  // checkboxes were parsed, so a resumed session was told there was nothing to
  // do while the handoff listed five prioritized items.
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-handon-next-"));
  mkdirSync(join(root, "docs", "handoff"), { recursive: true });
  mkdirSync(join(root, "docs", "adr"), { recursive: true });
  git(root, "init", "-q");
  git(root, "config", "user.email", "fixture@example.com");
  git(root, "config", "user.name", "Fixture");
  write(root, "src/thing.js", "export const thing = 1;\n");
  git(root, "add", "-A");
  git(root, "commit", "-qm", "feat(thing): the fixture");

  write(
    root,
    "docs/handoff/01-fixture.md",
    [
      "# Handoff 01: the fixture",
      "",
      "- **Branch**: `main`",
      "- **Date**: 2026-09-04",
      "",
      "## Next, in order of leverage",
      "",
      "1. **Decide what `saved.cache` means**: a hit replays tokens the model",
      "   still reads, so what it saves is recomputation.",
      "2. Label the remaining guardrail rules.",
      "3. Routing evals for the persona phrasings.",
      "",
      "## Conventions",
      "",
      "Conventional commits with a mandatory scope.",
      "",
    ].join("\n"),
  );
  git(root, "add", "-A");
  git(root, "commit", "-qm", "docs(handoff): add the fixture handoff");

  const report = handon({ projectDir: root });
  const { text } = report;

  assert.doesNotMatch(text, /listed no open items/, "the Next section is the open items");
  assert.match(text, /saved\.cache/, "the first item is carried over verbatim enough to act on");
  assert.match(text, /what it saves is recomputation/, "an item that wrapped in the handoff arrives whole, not cut at the column");
  assert.match(text, /Label the remaining guardrail rules/, "and so are the rest");
  assert.doesNotMatch(text, /Conventional commits/, "the section after Next is not part of it");
  assert.equal(report.claims.filter((claim) => claim.kind === "open").length, 3, "each item is a claim of its own, so every surface sees them");
});
