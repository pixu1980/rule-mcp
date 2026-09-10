

/**
 * Prettier drift guard: the block the installer appends must be byte-identical
 * to the block committed in ./CLAUDE.md.
 *
 * If the committed block drifts from RULES_CONTENT - a reflowed line, a blank
 * line inside the block - then every install is followed by a `pnpm format`
 * diff and the repository churns forever.
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

import { RULES_CONTENT, RULES_END_MARKER, RULES_MARKER } from "../../setup/_rules.data.js";

const projectClaude = readFileSync(new URL("../../../../CLAUDE.md", import.meta.url), "utf8");

/** The marked block as it appears in a file, sentinels included. */
function blockIn(text) {
  const start = text.indexOf(RULES_MARKER);
  const end = text.indexOf(RULES_END_MARKER);

  return start === -1 || end === -1 ? "" : text.slice(start, end + RULES_END_MARKER.length);
}

test("the committed CLAUDE.md carries the block", () => {
  assert.notEqual(blockIn(projectClaude), "", "CLAUDE.md must contain the rule-mcp-rules block");
});

test("the committed block is byte-identical to what the installer writes", () => {
  assert.equal(blockIn(projectClaude), RULES_CONTENT);
});

test("the block starts at its marker, with no leading blank line", () => {
  assert.ok(RULES_CONTENT.startsWith(`${RULES_MARKER}\n`), "a leading blank would be appended on every install and removed by none");
});

test("the block ends at its closing marker, with no trailing newline", () => {
  assert.ok(RULES_CONTENT.endsWith(RULES_END_MARKER), "the writer owns the trailing newline, so the content must not carry one");
});
