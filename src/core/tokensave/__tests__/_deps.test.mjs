

/**
 * @module test/tokensave/deps
 *
 * Contract for the manifest provider: TokenSave `config` when the graph is
 * available, a direct package.json read otherwise.
 */
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { projectManifest } from "../_deps.js";

/** A scratch project with a package.json. */
function project(manifest) {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-deps-"));

  writeFileSync(join(root, "package.json"), JSON.stringify(manifest));

  return root;
}

test("projectManifest falls back to package.json without a graph", () => {
  const root = project({ name: "probe", dependencies: { react: "1.0.0" }, devDependencies: { typescript: "5.0.0" }, engines: { node: ">=20" } });

  try {
    const manifest = projectManifest(root, { probe: () => ({ available: false }) });

    assert.equal(manifest.name, "probe");
    assert.equal(manifest.dependencies.react, "1.0.0");
    assert.equal(manifest.devDependencies.typescript, "5.0.0");
    assert.equal(manifest.engines.node, ">=20");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("projectManifest reads the keys through TokenSave config", () => {
  const client = (tool, args) => {
    const values = {
      name: "graph-probe",
      dependencies: { vue: "3.0.0" },
      devDependencies: { typescript: "5.0.0" },
      "engines.node": ">=22",
    };

    return { ok: true, value: { match_count: 1, matches: [{ file: "package.json", key: args.key, value: values[args.key] }] } };
  };
  const manifest = projectManifest("/tmp/p", { probe: () => ({ available: true }), client });

  assert.equal(manifest.name, "graph-probe");
  assert.equal(manifest.dependencies.vue, "3.0.0");
  assert.equal(manifest.engines.node, ">=22");
});

test("projectManifest falls back when the config call fails", () => {
  const root = project({ name: "probe" });

  try {
    const manifest = projectManifest(root, { probe: () => ({ available: true }), client: () => ({ ok: false, unavailable: true, error: "boom" }) });

    assert.equal(manifest.name, "probe");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
