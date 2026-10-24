

/** Branch coverage for the manifest provider's fallbacks. */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { projectManifest, readManifest } from "../_deps.js";

test("a malformed manifest reads as no manifest", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-deps-branches-"));

  writeFileSync(join(root, "package.json"), "{not json");

  assert.equal(readManifest(root), null);
});

test("an unreadable path that is not a missing file is rethrown", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-deps-branches-"));

  mkdirSync(join(root, "package.json"));

  assert.throws(() => readManifest(root), /EISDIR|illegal operation/u);
});

test("TokenSave config answers each key and defaults the missing ones", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-deps-branches-"));
  const values = { name: "app", dependencies: { a: "1" }, devDependencies: null, "engines.node": null };

  const manifest = projectManifest(root, {
    probe: () => ({ available: true }),
    client: (_tool, { key }) => (values[key] === null ? { ok: true, value: {} } : { ok: true, value: { matches: [{ value: values[key] }] } }),
  });

  assert.deepEqual(manifest, { name: "app", dependencies: { a: "1" }, devDependencies: {}, engines: {} });
});

test("four null answers fall back to package.json", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-deps-branches-"));

  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "from-file" }));

  const manifest = projectManifest(root, {
    probe: () => ({ available: true }),
    client: () => ({ ok: false }),
  });

  assert.equal(manifest.name, "from-file");
});

test("no graph reads package.json directly", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-deps-branches-"));

  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "direct", dependencies: { b: "2" } }));

  const manifest = projectManifest(root, { probe: () => ({ available: false }) });

  assert.deepEqual(manifest, { name: "direct", dependencies: { b: "2" } });
});
