

/**
 * An uninstall may only delete lines this installer wrote. The shell version
 * deleted every `export OPENAI_API_KEY=...` it found; that must not come back.
 */
import { strict as assert } from "node:assert";
import test from "node:test";

import { cleanProfileText, hasOwnedLines } from "../_shell-profile.js";

test("an owned comment and the export it annotates are removed together", () => {
  const before = ["export PATH=/usr/bin", "# rule-mcp: model key", 'export OPENAI_API_KEY="sk-rule"', "alias ll=ls"].join("\n");

  assert.equal(cleanProfileText(before), ["export PATH=/usr/bin", "alias ll=ls"].join("\n"));
});

test("a key the user set themselves survives", () => {
  const before = ['export OPENAI_API_KEY="sk-mine"', "# rule-mcp: model key", 'export ANTHROPIC_API_KEY="sk-rule"'].join("\n");

  assert.equal(cleanProfileText(before), 'export OPENAI_API_KEY="sk-mine"');
});

test("an owned comment with no export after it removes only itself", () => {
  const before = ["# rule-mcp: note", "echo hi"].join("\n");

  assert.equal(cleanProfileText(before), "echo hi");
});

test("a profile with nothing of ours is left alone", () => {
  const before = "export PATH=/usr/bin\nalias ll=ls\n";

  assert.equal(hasOwnedLines(before), false);
  assert.equal(cleanProfileText(before), before);
});

test("fish set -gx is recognized as the annotated export", () => {
  const before = ["# rule-mcp: model key", "set -gx OPENAI_API_KEY sk-rule", "echo hi"].join("\n");

  assert.equal(cleanProfileText(before), "echo hi");
});
