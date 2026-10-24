/** Installer path helpers: reads, atomic writes, backups, binary resolution. */
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const { atomicWrite, backupFile, readText, removeFile, resolveGlobalBinary, writeText } = await import("../_paths.js");

const dir = mkdtempSync(join(tmpdir(), "rule-mcp-paths-"));

test.after(() => rmSync(dir, { recursive: true, force: true }));

test("readText returns empty for a missing file", () => {
  assert.equal(readText(join(dir, "absent.json")), "", "a missing file reads empty");
  writeFileSync(join(dir, "present.txt"), "hello");
  assert.equal(readText(join(dir, "present.txt")), "hello", "an existing file reads");
});

test("writeText skips, overwrites and dry-runs", () => {
  const file = join(dir, "w.json");
  writeText({ file, content: "a" });
  assert.equal(readText(file), "a", "the file is written");

  writeText({ file, content: "b", skipIfExists: true, force: false });
  assert.equal(readText(file), "a", "without force an existing file is left alone");

  writeText({ file, content: "c", skipIfExists: true, force: true });
  assert.equal(readText(file), "c", "with force it replaces");

  writeText({ file: join(dir, "dry.json"), content: "d", dryRun: true });
  assert.equal(readText(join(dir, "dry.json")), "", "a dry run writes nothing");
});

test("atomicWrite backs up an existing file and cleans its temp", () => {
  const file = join(dir, "atomic.json");
  writeFileSync(file, "old");

  const out = atomicWrite({ file, content: "new" });
  assert.equal(out, file, "the write returns the file");
  assert.equal(readText(file), "new", "the content is replaced");
  assert.equal(readText(`${file}.bak`), "old", "the previous content is backed up");

  const dry = atomicWrite({ file: join(dir, "never.json"), content: "x", dryRun: true });
  assert.equal(dry, join(dir, "never.json"), "a dry run returns the path");
  assert.equal(readText(join(dir, "never.json")), "", "without writing");
});

test("atomicWrite and writeText refuse null content and backupFile is safe", () => {
  const file = join(dir, "null.json");
  assert.throws(() => atomicWrite({ file, content: null }), /null content/, "null content throws");
  assert.throws(() => writeText({ file, content: null }), /null content/, "writeText too");

  assert.equal(backupFile(join(dir, "not-there")), null, "backing up nothing is safe");
});

test("removeFile and the binary resolution behave", () => {
  const file = join(dir, "gone.txt");
  writeFileSync(file, "x");
  removeFile(file);
  assert.equal(readText(file), "", "the file is removed");
  assert.doesNotThrow(() => removeFile(file), "removing again is fine");

  const found = resolveGlobalBinary();
  assert.ok(found === null || typeof found === "string", "the binary resolves to a path or nothing");
});
