/** The resume prompt section: the paste-ready block rides with the handoff it belongs to. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { resumePromptLines } from "../_sections-prompt.js";

test("a rendered handoff closes with the prompt the next session opens with", () => {
  // The block used to live in the chat only, so a session that ended before the
  // reader copied it left nothing behind. Written into the document, it travels
  // with the file and `handon` can hand it back on resume.
  const lines = resumePromptLines({ projectName: "demo-proj" }, {});
  const text = lines.join("\n");

  assert.equal(lines[0], "### Resume Prompt", "the section is a heading like every other one");
  assert.match(text, /```prompt/, "the block is fenced, so a parser reads one span");
  assert.match(text, /Resume work on demo-proj/, "the prompt names the project");
  assert.match(text, /`rule_tool_handon`/, "it tells the next session how to check the claims first");
  assert.match(text, /`type\(scope\): subject`/, "the commit-scope convention travels with it");
  assert.match(text, /scope-less message/, "and the reason the scope is not optional");
});

test("the format ladder keeps the prompt wherever a document survives", () => {
  const brief = resumePromptLines({ projectName: "demo-proj" }, { isBrief: true }).join("\n");

  assert.match(brief, /### Resume Prompt/, "the brief handoff is still a document, so it carries the block");
  assert.deepEqual(resumePromptLines({ projectName: "demo-proj" }, { isMinimal: true }), [], "the minimal handoff is a one-line paste, not a document to resume from");
});

test("the section can be rendered at another heading level", () => {
  // A handoff document opens with its own `#` title, so its sections are `##`;
  // the tool's own output nests under `## HANDOFF:` and uses `###`. Same block,
  // two depths - which is why the parser accepts either.
  assert.match(resumePromptLines({ projectName: "x" }, { heading: "##" })[0], /^## Resume Prompt$/, "the caller picks the depth");
});
