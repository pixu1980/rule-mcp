/** Project detection: framework, typescript, build tool, tokensave probe. */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { detectProject, detectProjectGraph, getFrameworkSuggestion, hasTokensave } from "../index.js";

const dir = mkdtempSync(join(tmpdir(), "rule-mcp-detect-"));

test.after(() => rmSync(dir, { recursive: true, force: true }));

const project = (deps = {}, devDeps = {}, extra = {}) => {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-detect-proj-"));
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "p", dependencies: deps, devDependencies: devDeps, ...extra }, null, 2));
  return root;
};

test("detectProject reads react, typescript and vite from package.json", () => {
  const root = project({ react: "^19.0.0", vite: "^5.0.0" }, { typescript: "^5.0.0" }, { engines: { node: ">=20" } });
  writeFileSync(join(root, "vite.config.ts"), "");
  const detected = detectProject(root);

  assert.equal(detected.framework, "react", "react is detected from dependencies");
  assert.equal(detected.typescript, true, "typescript carries");
  assert.equal(detected.buildTool, "vite", "a vite config selects the build tool");
  assert.equal(detected.nodeVersion, ">=20", "the engine is reported");
  assert.equal(detected.projectName, "p", "the project name reports");
  rmSync(root, { recursive: true, force: true });
});

test("detectProject falls back for missing or malformed manifests", () => {
  const empty = mkdtempSync(join(tmpdir(), "rule-mcp-detect-none-"));
  const detected = detectProject(empty);
  assert.equal(detected.framework, "vanilla", "no manifest means vanilla");
  assert.equal(detected.projectName, "unknown", "no manifest means unknown name");
  assert.equal(detected.typescript, false, "no manifest means no typescript");
  rmSync(empty, { recursive: true, force: true });

  const bad = mkdtempSync(join(tmpdir(), "rule-mcp-detect-bad-"));
  writeFileSync(join(bad, "package.json"), "{ nope");
  const fallback = detectProject(bad);
  assert.equal(fallback.framework, "vanilla", "a malformed manifest means vanilla");
  rmSync(bad, { recursive: true, force: true });
});

test("detectProjectGraph reads the same profile through the config provider", () => {
  const root = project({ react: "^19.0.0", vite: "^5.0.0" }, { typescript: "^5.0.0" }, { engines: { node: ">=20" } });
  const client = (tool, args) => {
    const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    const values = { name: manifest.name, dependencies: manifest.dependencies, devDependencies: manifest.devDependencies, "engines.node": manifest.engines?.node };

    return { ok: true, value: { match_count: 1, matches: [{ value: values[args.key] }] } };
  };

  try {
    const graph = detectProjectGraph(root, { probe: () => ({ available: true }), client });
    const direct = detectProject(root);

    assert.deepEqual(graph, direct);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("detectProjectGraph falls back to the direct read when the client fails", () => {
  const root = project({ vue: "^3.0.0" });

  try {
    const graph = detectProjectGraph(root, { probe: () => ({ available: true }), client: () => ({ ok: false, unavailable: true, error: "boom" }) });

    assert.equal(graph.framework, "vue");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("getFrameworkSuggestion falls back for unknown frameworks", () => {
  assert.equal(getFrameworkSuggestion("react").skillName, "rule-mcp-frontend-react", "known frameworks map");
  assert.equal(getFrameworkSuggestion("mystery").skillName, "rule-mcp-frontend", "unknown frameworks fall back to the frontend area");
});

test("hasTokensave answers from the graph directory", () => {
  const withGraph = mkdtempSync(join(tmpdir(), "rule-mcp-detect-ts-"));
  mkdirSync(join(withGraph, ".tokensave"), { recursive: true });
  assert.equal(hasTokensave(withGraph), true, "a graph directory counts");
  assert.equal(hasTokensave(dir), false, "without one it does not");
  rmSync(withGraph, { recursive: true, force: true });
});
