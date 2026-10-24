/**
 * @module test/tokensave/parity
 *
 * The parity matrix: every comparable adapter path answers the same as the
 * JavaScript it replaced when the graph is present, and the JavaScript path is
 * the one used when it is not.
 */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { detectProject, detectProjectGraph } from "../../detector/index.js";
import { projectManifest } from "../_deps.js";
import { listFiles, walkFiles } from "../_files.js";

/** A scratch project, kept until the test cleans it. */
function scratch(build) {
  const dir = mkdtempSync(join(tmpdir(), "rule-mcp-parity-"));

  build(dir);

  return dir;
}

test("listFiles produces the same paths with and without the graph", () => {
  const dir = scratch((base) => {
    mkdirSync(join(base, "src/a"), { recursive: true });
    writeFileSync(join(base, "src/a/b.js"), "");
    writeFileSync(join(base, "src/c.js"), "");
  });

  try {
    const graph = listFiles(dir, { path: "src", probe: () => ({ available: true }), client: () => ({ ok: true, value: walkFiles(dir, "src").join("\n") }) });
    const direct = listFiles(dir, { path: "src", probe: () => ({ available: false }) });

    assert.deepEqual(graph.files.sort(), direct.files.sort());
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("projectManifest produces the same manifest with and without the graph", () => {
  const manifest = { name: "p", dependencies: { react: "1" }, devDependencies: { typescript: "5" }, engines: { node: ">=20" } };
  const dir = scratch((base) => writeFileSync(join(base, "package.json"), JSON.stringify(manifest)));
  const client = (tool, args) => {
    const values = { name: manifest.name, dependencies: manifest.dependencies, devDependencies: manifest.devDependencies, "engines.node": manifest.engines.node };

    return { ok: true, value: { matches: [{ value: values[args.key] }] } };
  };

  try {
    const graph = projectManifest(dir, { probe: () => ({ available: true }), client });
    const direct = projectManifest(dir, { probe: () => ({ available: false }) });

    assert.deepEqual(graph, direct);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("detectProjectGraph matches detectProject", () => {
  const manifest = { name: "p", dependencies: { react: "1", vite: "5" }, devDependencies: { typescript: "5" }, engines: { node: ">=20" } };
  const dir = scratch((base) => writeFileSync(join(base, "package.json"), JSON.stringify(manifest)));

  try {
    const graph = detectProjectGraph(dir, { probe: () => ({ available: false }) });
    const direct = detectProject(dir);

    assert.deepEqual(graph, direct);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
