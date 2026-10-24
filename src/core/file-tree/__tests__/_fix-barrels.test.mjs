

/**
 * The barrel writers called directly, for the paths a whole-tree fix cannot
 * reach: a folder that vanished, a barrel that cannot be written, and an issue
 * the caller marked unfixable.
 */
import { strict as assert } from "node:assert";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { createMissingBarrels, populateEmptyBarrels } from "../_fix-barrels.js";

const box = () => mkdtempSync(join(tmpdir(), "rule-mcp-barrels-"));

test("createMissingBarrels ignores issues of another type or marked unfixable", () => {
  const fixed = [];
  const errors = [];

  createMissingBarrels(
    [
      { type: "wrong-prefix", path: "/nope", fixable: true },
      { type: "missing-barrel", path: "/nope", fixable: false },
    ],
    false,
    fixed,
    errors,
  );

  assert.deepEqual(fixed, [], "nothing is written");
  assert.deepEqual(errors, [], "and nothing is an error");
});

test("createMissingBarrels reports a directory it cannot read", () => {
  const fixed = [];
  const errors = [];

  createMissingBarrels([{ type: "missing-barrel", path: join(box(), "gone"), fixable: true }], false, fixed, errors);

  assert.equal(errors.length, 1, "the unreadable directory is reported");
  assert.match(errors[0].error, /Cannot read directory/);
  assert.deepEqual(fixed, [], "and nothing is claimed as fixed");
});

test("createMissingBarrels writes a header-only barrel when there is nothing to export", () => {
  const root = box();
  const folder = join(root, "Button");
  mkdirSync(folder);
  writeFileSync(join(folder, "notes.md"), "no components here\n");

  const fixed = [];
  createMissingBarrels([{ type: "missing-barrel", path: folder, fixable: true }], false, fixed, []);

  const barrel = readFileSync(join(folder, "index.js"), "utf8");
  assert.match(barrel, /@module Button/, "the header is written");
  assert.ok(!barrel.includes("export {"), "nothing is invented to export");
  assert.deepEqual(
    fixed.map((entry) => entry.action),
    ["Created index.js"],
    "the write is reported",
  );

  rmSync(root, { recursive: true, force: true });
});

test("createMissingBarrels reports a barrel it cannot write", () => {
  const root = box();
  const folder = join(root, "Button");
  mkdirSync(folder);
  writeFileSync(join(folder, "_Button.jsx"), "export function Button() {}\n");
  chmodSync(folder, 0o500);

  const fixed = [];
  const errors = [];

  try {
    createMissingBarrels([{ type: "missing-barrel", path: folder, fixable: true }], false, fixed, errors);

    assert.equal(errors.length, 1, "a read-only folder is an error, not a silent skip");
    assert.match(errors[0].error, /Cannot write/);
  } finally {
    chmodSync(folder, 0o700);
    rmSync(root, { recursive: true, force: true });
  }
});

test("populateEmptyBarrels skips other types, missing folders and folders with nothing to export", () => {
  const root = box();
  const folder = join(root, "Button");
  mkdirSync(folder);
  writeFileSync(join(folder, "index.js"), "");

  const fixed = [];
  const errors = [];

  populateEmptyBarrels(
    [
      { type: "missing-barrel", path: join(folder, "index.js"), fixable: true },
      { type: "empty-barrel", path: join(folder, "index.js"), fixable: false },
      { type: "empty-barrel", path: join(root, "Gone", "index.js"), fixable: true },
      { type: "empty-barrel", path: join(folder, "index.js"), fixable: true },
    ],
    false,
    fixed,
    errors,
  );

  assert.deepEqual(fixed, [], "an empty folder gives the barrel nothing to say");
  assert.deepEqual(errors, [], "and a folder that is gone is skipped, not reported");

  rmSync(root, { recursive: true, force: true });
});

test("populateEmptyBarrels reports a barrel it cannot write", () => {
  const root = box();
  const folder = join(root, "Button");
  mkdirSync(folder);
  writeFileSync(join(folder, "index.js"), "");
  writeFileSync(join(folder, "_Button.jsx"), "export function Button() {}\n");
  chmodSync(join(folder, "index.js"), 0o400);

  const errors = [];

  try {
    populateEmptyBarrels([{ type: "empty-barrel", path: join(folder, "index.js"), fixable: true }], false, [], errors);

    assert.equal(errors.length, 1, "a read-only barrel is reported");
    assert.equal(errors[0].path, join(folder, "index.js"));
  } finally {
    chmodSync(join(folder, "index.js"), 0o600);
    rmSync(root, { recursive: true, force: true });
  }
});

test("a dry run of either writer changes nothing on disk", () => {
  const root = box();
  const folder = join(root, "Button");
  mkdirSync(folder);
  writeFileSync(join(folder, "index.js"), "");
  writeFileSync(join(folder, "_Button.jsx"), "export function Button() {}\n");

  const fixed = [];
  populateEmptyBarrels([{ type: "empty-barrel", path: join(folder, "index.js"), fixable: true }], true, fixed, []);

  assert.match(fixed[0].action, /^\[DRY RUN\]/, "the action is marked as a preview");
  assert.equal(readFileSync(join(folder, "index.js"), "utf8"), "", "the barrel is still empty");

  rmSync(root, { recursive: true, force: true });
});
