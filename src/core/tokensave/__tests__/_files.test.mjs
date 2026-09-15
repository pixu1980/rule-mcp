

/**
 * @module test/tokensave/files
 *
 * Contract for the file-listing provider: parse the TokenSave flat listing,
 * walk the tree when the graph is absent, and pick the source.
 */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { listFiles, parseFlatFileList, walkFiles } from "../_files.js";

/** Create a scratch project, run `build` on it, and keep it for the test. */
function scratch(build) {
  const dir = mkdtempSync(join(tmpdir(), "rule-files-"));

  build(dir);

  return dir;
}

test("parseFlatFileList keeps the path and drops the symbol/byte suffix", () => {
  const files = parseFlatFileList("docs/adr/001-a.md (10 symbols, 5872 bytes)\ndocs/adr/002-b.md (6 symbols, 1208 bytes)");

  assert.deepEqual(files, ["docs/adr/001-a.md", "docs/adr/002-b.md"]);
});

test("parseFlatFileList tolerates junk and empty input", () => {
  assert.deepEqual(parseFlatFileList(""), []);
  assert.deepEqual(parseFlatFileList(null), []);
  assert.deepEqual(parseFlatFileList("  \n\n"), []);
});

test("walkFiles lists project-relative files under a path", () => {
  const dir = scratch((base) => {
    mkdirSync(join(base, "docs/adr"), { recursive: true });
    writeFileSync(join(base, "docs/adr/001-a.md"), "# a");
    writeFileSync(join(base, "docs/adr/002-b.md"), "# b");
    writeFileSync(join(base, "package.json"), "{}");
  });

  try {
    assert.deepEqual(walkFiles(dir, "docs/adr"), ["docs/adr/001-a.md", "docs/adr/002-b.md"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("listFiles uses TokenSave when the graph is available", () => {
  const result = listFiles("/tmp/project", {
    path: "docs/adr",
    probe: () => ({ available: true }),
    client: () => ({ ok: true, value: "docs/adr/001-a.md (10 symbols, 5872 bytes)" }),
  });

  assert.deepEqual(result, { files: ["docs/adr/001-a.md"], source: "tokensave" });
});

test("listFiles falls back to the walk when the graph is absent", () => {
  const dir = scratch((base) => {
    mkdirSync(join(base, "docs/adr"), { recursive: true });
    writeFileSync(join(base, "docs/adr/001-a.md"), "# a");
  });

  try {
    const result = listFiles(dir, { path: "docs/adr", probe: () => ({ available: false }) });

    assert.deepEqual(result, { files: ["docs/adr/001-a.md"], source: "javascript" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("listFiles falls back to the walk when the client fails", () => {
  const dir = scratch((base) => {
    mkdirSync(join(base, "docs/adr"), { recursive: true });
    writeFileSync(join(base, "docs/adr/001-a.md"), "# a");
  });

  try {
    const result = listFiles(dir, {
      path: "docs/adr",
      probe: () => ({ available: true }),
      client: () => ({ ok: false, unavailable: true, error: "no binary" }),
    });

    assert.deepEqual(result, { files: ["docs/adr/001-a.md"], source: "javascript" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("listFiles unions the index with a live walk when asked", () => {
  const dir = scratch((base) => {
    mkdirSync(join(base, "docs/adr"), { recursive: true });
    writeFileSync(join(base, "docs/adr/002-new.md"), "# new");
  });

  try {
    const result = listFiles(dir, {
      path: "docs/adr",
      union: true,
      probe: () => ({ available: true }),
      client: () => ({ ok: true, value: "docs/adr/001-old.md (10 symbols, 100 bytes)" }),
    });

    assert.deepEqual(result.files, ["docs/adr/001-old.md", "docs/adr/002-new.md"]);
    assert.equal(result.source, "tokensave");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
