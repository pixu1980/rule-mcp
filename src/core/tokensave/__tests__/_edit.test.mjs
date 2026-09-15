

/**
 * @module test/tokensave/edit
 *
 * Contract for the edit adapter: TokenSave first when the file exists and the
 * graph is available, a direct write otherwise, and never a silent overwrite
 * when the content is already what it should be.
 */
import { strict as assert } from "node:assert";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { applyEdit } from "../_edit.js";

/** A scratch directory. */
const scratch = () => mkdtempSync(join(tmpdir(), "rule-edit-"));

test("applyEdit falls back when there is no graph", () => {
  const root = scratch();
  const file = join(root, "a.js");

  writeFileSync(file, "old");

  try {
    const result = applyEdit(root, file, "new", { probe: () => ({ available: false }) });

    assert.equal(result.source, "javascript");
    assert.equal(readFileSync(file, "utf8"), "new");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("applyEdit writes a new file directly", () => {
  const root = scratch();
  const file = join(root, "new.js");

  try {
    const result = applyEdit(root, file, "content", { probe: () => ({ available: true }) });

    assert.equal(result.source, "javascript");
    assert.equal(readFileSync(file, "utf8"), "content");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("applyEdit uses str_replace when the graph is available", () => {
  const root = scratch();
  const file = join(root, "a.js");
  const calls = [];

  writeFileSync(file, "old");

  try {
    const result = applyEdit(root, file, "new", {
      probe: () => ({ available: true }),
      client: (tool, args) => {
        calls.push({ tool, args });

        return { ok: true, value: {} };
      },
    });

    assert.equal(result.source, "tokensave");
    assert.equal(calls[0].tool, "str_replace");
    assert.equal(calls[0].args.old_str, "old");
    assert.equal(calls[0].args.new_str, "new");
    assert.equal(readFileSync(file, "utf8"), "old", "the adapter does not write when TokenSave answers");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("applyEdit falls back when the client fails", () => {
  const root = scratch();
  const file = join(root, "a.js");

  writeFileSync(file, "old");

  try {
    const result = applyEdit(root, file, "new", { probe: () => ({ available: true }), client: () => ({ ok: false, unavailable: true, error: "boom" }) });

    assert.equal(result.source, "javascript");
    assert.equal(readFileSync(file, "utf8"), "new");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("applyEdit reports no change when the content is identical", () => {
  const root = scratch();
  const file = join(root, "a.js");
  const calls = [];

  writeFileSync(file, "same");

  try {
    const result = applyEdit(root, file, "same", {
      probe: () => ({ available: true }),
      client: () => {
        calls.push(1);

        return { ok: true };
      },
    });

    assert.equal(result.changed, false);
    assert.equal(calls.length, 0, "an unchanged file never calls the graph");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
