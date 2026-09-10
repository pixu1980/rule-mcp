/**
 * The instruction block is a compatibility surface: install writes it,
 * uninstall has to find it again, and repeated cycles must leave the host
 * file exactly as they found it.
 */
import { strict as assert } from "node:assert";
import test from "node:test";

import { RULES_CONTENT, RULES_MARKER } from "../_rules.data.js";
import { hasRulesBlock, withRulesBlock, withoutRulesBlock } from "../_rules.js";

test("an empty file gets the block and one trailing newline", () => {
  assert.equal(withRulesBlock(""), `${RULES_CONTENT}\n`);
});

test("an existing file keeps one blank line before the block", () => {
  assert.equal(withRulesBlock("# Title\n"), `# Title\n\n${RULES_CONTENT}\n`);
});

test("trailing blank lines are normalized, never accumulated", () => {
  assert.equal(withRulesBlock("# Title\n\n\n\n"), `# Title\n\n${RULES_CONTENT}\n`);
});

test("install then uninstall restores the original text", () => {
  const original = "# Title\n\nSome prose.\n";

  assert.equal(withoutRulesBlock(withRulesBlock(original)), original);
});

test("repeated install/uninstall cycles never drift", () => {
  let text = "# Title\n\nSome prose.\n";

  for (let cycle = 0; cycle < 5; cycle++) {
    text = withoutRulesBlock(withRulesBlock(text));
  }

  assert.equal(text, "# Title\n\nSome prose.\n");
});

test("uninstalling from a file without the block is a no-op", () => {
  assert.equal(withoutRulesBlock("# Title\n"), "# Title\n");
});

test("hasRulesBlock recognizes the marker", () => {
  assert.equal(hasRulesBlock("nothing here"), false);
  assert.equal(hasRulesBlock(`x\n${RULES_MARKER}\n`), true);
});

test("removal keeps text that follows the block", () => {
  const text = `# Title\n\n${RULES_CONTENT}\n\n## After\n`;

  assert.equal(withoutRulesBlock(text), "# Title\n\n## After\n");
});
