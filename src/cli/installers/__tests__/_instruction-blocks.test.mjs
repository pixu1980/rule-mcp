

/**
 * What an install appends to an agent's instruction file.
 *
 * Two blocks, both sentinel-delimited: the short routing line, and the
 * enforced-workflow rules the shell installer used to write by itself. The
 * shell is a bootstrap now (ADR 090), so the bytes it owned have to be here -
 * and they have to name tools this server actually registers, which the
 * shell's copy did and the node copy did not.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { appendInstruction, removeInstruction } from "../_writers-text.js";
import { INSTRUCTION_MARKER, RULES_MARKER } from "../_instruction.data.js";

const written = () => appendInstruction("# CLAUDE.md\n\nSome existing text.\n");

test("an install writes both blocks, each inside its own sentinels", () => {
  const text = written();

  for (const marker of [INSTRUCTION_MARKER, RULES_MARKER]) {
    assert.ok(text.includes(marker), `${marker} is missing`);
    assert.ok(text.includes(marker.replace("<!-- ", "<!-- /")), `the closing sentinel of ${marker} is missing`);
  }

  assert.ok(text.startsWith("# CLAUDE.md"), "what was already in the file stays at the top");
});

test("the rules name the tools this server registers", () => {
  const text = written();

  for (const tool of ["rule_tool -", "rule_tool_process_adr", "rule_tool_handoff", "rule_tool_check"]) {
    assert.ok(text.includes(tool), `the rules must reference ${tool}`);
  }
  // The node block advertised a surface that does not exist: `rule_tool_component`
  // and `rule_tool_scaffold` were never registered. The names the server does
  // answer to (`rule_tool_check`, `rule_tool_search`, `rule_tool_process_adr`)
  // stay in the block above.
  for (const absent of ["rule_tool_component", "rule_tool_scaffold"]) {
    assert.ok(!new RegExp(`(?<![A-Za-z0-9_])${absent}(?![A-Za-z0-9_])`).test(text), `${absent} is not a tool`);
  }
});

test("a removal takes back exactly what the install added", () => {
  const before = "# CLAUDE.md\n\nSome existing text.";

  assert.equal(removeInstruction(appendInstruction(`${before}\n`)), before);
});

test("a second install refreshes the blocks rather than stacking them", () => {
  const once = written();
  const twice = appendInstruction(once, { refresh: true });
  const count = (text, marker) => text.split(marker).length - 1;

  assert.equal(count(twice, INSTRUCTION_MARKER), 1);
  assert.equal(count(twice, RULES_MARKER), 1);
  assert.equal(twice, once, "a refresh of the current text is the current text");
});

test("without a refresh an existing block is left alone", () => {
  const once = written();

  assert.equal(appendInstruction(once), once);
});
