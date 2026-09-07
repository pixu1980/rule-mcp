/** new and deprecate: overlays valid by construction, never overwritten, never incomplete. */
import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { overlayFile, parsePersonaFile, roles, sandbox, validateRole } from "./_cli.fixture.mjs";

test("new writes an overlay the validator accepts", () => {
  const box = sandbox();
  const run = roles(
    box,
    "new",
    "perf-hawk",
    "--role",
    "Performance Hawk",
    "--skills",
    "profiling,caching",
    "--years",
    "12",
  );

  assert.equal(run.status, 0, `${run.stdout}${run.stderr}`);
  assert.ok(existsSync(overlayFile(box, "perf-hawk")), "the overlay lands in the user layer");

  const written = parsePersonaFile(readFileSync(overlayFile(box, "perf-hawk"), "utf8"));
  assert.deepEqual(validateRole(written), [], `the file must be valid: ${JSON.stringify(written)}`);
  assert.equal(written.role, "Performance Hawk");
  assert.equal(written.yearsOfExperience, 12);
  assert.deepEqual(written.skills, ["profiling", "caching"]);
});

test("a role created this way shows up as the user's, not as embedded", () => {
  const box = sandbox();
  roles(box, "new", "perf-hawk", "--role", "Performance Hawk", "--skills", "profiling");

  const listed = roles(box, "list");
  assert.match(listed.stdout, /perf-hawk/, "the new role is in the merged view");
  assert.match(listed.stdout, /perf-hawk.*user|user.*perf-hawk/s, "and it is attributed to the user layer");
});

test("new refuses to overwrite a role the user already has", () => {
  const box = sandbox();
  roles(box, "new", "perf-hawk", "--role", "Performance Hawk", "--skills", "profiling");

  const again = roles(box, "new", "perf-hawk", "--role", "Someone Else", "--skills", "guessing");
  assert.equal(again.status, 1, "a second new must not silently replace the first");
  assert.match(`${again.stdout}${again.stderr}`, /perf-hawk/, "and it says which role is in the way");
});

test("new says what is missing instead of writing an invalid file", () => {
  const box = sandbox();
  const run = roles(box, "new", "perf-hawk");

  assert.equal(run.status, 1);
  assert.match(`${run.stdout}${run.stderr}`, /--role/, "the missing flag is named");
  assert.equal(existsSync(overlayFile(box, "perf-hawk")), false, "nothing is written when the input is incomplete");
});

test("deprecate flips the status in the user layer", () => {
  const box = sandbox();
  roles(box, "new", "perf-hawk", "--role", "Performance Hawk", "--skills", "profiling");

  const run = roles(box, "deprecate", "perf-hawk", "--by", "security");
  assert.equal(run.status, 0, `${run.stdout}${run.stderr}`);

  const written = parsePersonaFile(readFileSync(overlayFile(box, "perf-hawk"), "utf8"));
  assert.equal(written.status, "deprecated");
  assert.equal(written.deprecatedBy, "security");
  assert.deepEqual(validateRole(written), [], "a deprecated role still has to validate");
});

test("deprecating an embedded role writes the user's own copy of it", () => {
  const box = sandbox();
  const run = roles(box, "deprecate", "architect", "--by", "security");

  assert.equal(run.status, 0, `${run.stdout}${run.stderr}`);
  const written = parsePersonaFile(readFileSync(overlayFile(box, "architect"), "utf8"));
  assert.equal(written.status, "deprecated", "the embedded catalog is never edited; the overlay wins instead");
  assert.equal(written.role, "Software Architect", "and the copy keeps what the embedded role said");
});

test("deprecate needs to know what replaces the role", () => {
  const box = sandbox();
  const run = roles(box, "deprecate", "architect");

  assert.equal(run.status, 1, "a deprecated role with nothing to point at would not validate");
  assert.match(`${run.stdout}${run.stderr}`, /--by/, "so the flag is named");
});
