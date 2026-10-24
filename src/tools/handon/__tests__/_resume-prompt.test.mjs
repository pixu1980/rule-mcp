/** The resume prompt: the block the handoff wrote for the next session, read back. */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { promptToRunLines, resumePrompt } from "../_resume-prompt.js";
import { openItems } from "../_open-items.js";
import { git, handon, write } from "./_handon.fixture.mjs";
import "../../../../tests/fixtures/git-hermetic.mjs";

/** A handoff whose tail carries the block the next session is meant to start from. */
const body = [
  "# Handoff 09: the fixture",
  "",
  "**Branch:** `main` - **Date:** 2026-09-17",
  "",
  "## Next, in order of leverage",
  "",
  "1. Write the parser before the renderer.",
  "",
  "## Resume Prompt",
  "",
  "The next session opens with this block.",
  "",
  "```prompt",
  "Read `docs/handoff/09-fixture.md`, then run `rule_tool_handon`.",
  "Every commit is `type(scope): subject`.",
  "```",
  "",
].join("\n");

test("the fenced block under the Resume Prompt heading is the prompt", () => {
  // The workflow asks the handoff to close with a prompt the next session can
  // be handed as its first message. Reading it back is what makes the block
  // worth writing: a prompt trapped in a markdown tail is read by humans only.
  assert.equal(resumePrompt(body), "Read `docs/handoff/09-fixture.md`, then run `rule_tool_handon`.\nEvery commit is `type(scope): subject`.");
  assert.doesNotMatch(resumePrompt(body), /The next session opens with this block/, "the prose introducing the block is not part of it");
});

test("a handoff without the section reports no prompt instead of inventing one", () => {
  const without = "# Handoff 09: the fixture\n\n## Next\n\n1. Do the thing.\n";

  assert.equal(resumePrompt(without), undefined, "no section, no prompt - the fallback is the derived first move");
  assert.equal(resumePrompt("## Resume Prompt\n\n## Conventions\n\nScoped commits.\n"), undefined, "an empty section is not a prompt");
  assert.equal(resumePrompt(""), undefined, "an empty body has no prompt");
  assert.equal(resumePrompt(), undefined, "so does a body that is not there");
});

test("the section ends at the next heading, fence or not", () => {
  // Hand-written handoffs do not all fence their blocks: the fence is a
  // convenience for the parser, not a requirement the reader has to meet.
  const unfenced = ["## Resume Prompt", "", "Start with the parser.", "", "## Conventions", "", "Scoped commits only.", ""].join("\n");

  assert.equal(resumePrompt(unfenced), "Start with the parser.", "the next heading closes the section");
  assert.equal(resumePrompt("## Resume Prompt\n\nOpened but never closed.\n"), "Opened but never closed.", "an unterminated fence keeps the rest of the section");

  const levelTwo = ["# Doc", "", "## Resume Prompt", "", "```prompt", "Pick up at the parser.", "```", ""].join("\n");
  assert.equal(resumePrompt(levelTwo), "Pick up at the parser.", "a level-two heading works as well as a deeper one");
});

test("a quoted prompt is not the handoff's own open work", () => {
  // The block is a message about the session, so it may spell its steps out.
  // Counting those as the handoff's open items would hand the next session a
  // list of the previous one's leftovers.
  const quoted = ["# Handoff 09", "", "## Resume Prompt", "", "```prompt", "1. Read the ADR log.", "- [ ] confirm the branch", "```", ""].join("\n");
  const mixed = ["## Next", "", "1. A real item.", "", "```text", "1. A quoted step", "- [ ] a quoted box", "```", "", "2. Another real item.", ""].join("\n");

  assert.deepEqual(openItems(quoted), [], "steps inside the quoted block are quoted content, not open items");
  assert.deepEqual(openItems(mixed), ["A real item.", "Another real item."], "a quote inside the Next list is skipped, not counted and not mistaken for the end");
  assert.deepEqual(openItems("## Next\n\n1. A real item.\n"), ["A real item."], "the real list is still read");
});

test("the report closes with the prompt the handoff wrote", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-handon-prompt-"));
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
      "## Next",
      "",
      "1. Wire the parser.",
      "",
      "## Resume Prompt",
      "",
      "```prompt",
      "Read `docs/handoff/01-fixture.md` and run `rule_tool_handon` first.",
      "```",
      "",
    ].join("\n"),
  );
  git(root, "add", "-A");
  git(root, "commit", "-qm", "docs(handoff): add the fixture handoff");

  const { text } = handon({ projectDir: root });

  assert.match(text, /## Prompt to run next/, "the report carries the prompt");
  assert.match(text, /run `rule_tool_handon` first/, "and quotes it verbatim");
  assert.ok(text.trimEnd().endsWith("```"), "the prompt is the last thing in the report, so copying it is one block");
});

test("the renderer names the source and quotes the block", () => {
  const lines = promptToRunLines("Start with the parser.", { source: "docs/handoff/01-fixture.md" }).join("\n");

  assert.match(lines, /## Prompt to run next/, "the section names itself");
  assert.match(lines, /`docs\/handoff\/01-fixture\.md`/, "the reader is told which file said it");
  assert.match(lines, /```prompt\nStart with the parser\.\n```/, "the block is fenced and unchanged");
  assert.deepEqual(promptToRunLines(undefined, {}), [], "no prompt renders nothing");
});
