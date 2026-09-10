

/** Project detection: framework, typescript, build tool, tokensave probe. */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { detectProject, getFrameworkSuggestion, hasTokensave } from "../index.js";

const dir = mkdtempSync(join(tmpdir(), "rule-detect-"));

test.after(() => rmSync(dir, { recursive: true, force: true }));

const project = (deps = {}, devDeps = {}, extra = {}) => {
  const root = mkdtempSync(join(tmpdir(), "rule-detect-proj-"));
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
  const empty = mkdtempSync(join(tmpdir(), "rule-detect-none-"));
  const detected = detectProject(empty);
  assert.equal(detected.framework, "vanilla", "no manifest means vanilla");
  assert.equal(detected.projectName, "unknown", "no manifest means unknown name");
  assert.equal(detected.typescript, false, "no manifest means no typescript");
  rmSync(empty, { recursive: true, force: true });

  const bad = mkdtempSync(join(tmpdir(), "rule-detect-bad-"));
  writeFileSync(join(bad, "package.json"), "{ nope");
  const fallback = detectProject(bad);
  assert.equal(fallback.framework, "vanilla", "a malformed manifest means vanilla");
  rmSync(bad, { recursive: true, force: true });
});

test("getFrameworkSuggestion falls back for unknown frameworks", () => {
  assert.equal(getFrameworkSuggestion("react").skillName, "rule-frontend-react", "known frameworks map");
  assert.equal(getFrameworkSuggestion("mystery").skillName, "rule-frontend-vanilla-reactive", "unknown frameworks fall back");
});

test("hasTokensave answers from the graph directory", () => {
  const withGraph = mkdtempSync(join(tmpdir(), "rule-detect-ts-"));
  mkdirSync(join(withGraph, ".tokensave"), { recursive: true });
  assert.equal(hasTokensave(withGraph), true, "a graph directory counts");
  assert.equal(hasTokensave(dir), false, "without one it does not");
  rmSync(withGraph, { recursive: true, force: true });
});
