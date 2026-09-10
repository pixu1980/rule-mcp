

/** parsePersonaFile: nullable fields, comments, blanks and frameless bodies. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { parsePersonaFile } from "../index.js";

test("deprecatedBy parses null, a value, and an empty value in kind", () => {
  const framed = (deprecated) => `---\nid: sample\ndeprecatedBy: ${deprecated}\n---\n\n- a lens\n`;

  assert.equal(parsePersonaFile(framed("null")).deprecatedBy, null, "the literal null reads as null");
  assert.equal(parsePersonaFile(framed("successor")).deprecatedBy, "successor", "a named successor reads as itself");
  assert.equal("deprecatedBy" in parsePersonaFile(framed("")), false, "an empty value leaves the field absent");
});

test("comments, blank lines and non-entry lines are skipped without complaint", () => {
  const role = parsePersonaFile("---\n# a comment\n\nid: sample\nnot a yaml entry at all ::\nversion: 3\n---\nbody text\n");

  assert.equal(role.id, "sample", "the entry after the comment reads");
  assert.equal(role.version, 3, "a numeric field converts to a number");
  assert.deepEqual(role.lenses, [], "a body with no bullets has no lenses");
});

test("a frameless text is all body, and nullish input parses to nothing", () => {
  const frameless = parsePersonaFile("just a body\n- only lens\n");
  assert.deepEqual(frameless.lenses, ["only lens"], "the body bullets read as lenses");
  assert.equal(frameless.id, undefined, "no frontmatter means no fields");

  assert.deepEqual(parsePersonaFile().lenses, [], "nullish input parses to an empty role");
});
