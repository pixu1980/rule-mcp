/** The handoff builder: sections per format, sources, and the budget degrade. */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { readAdrs, readContextValues, readProjectIdentity } from "../_sources.js";
import { buildHandoff } from "../_build.js";
import { adrLines, contextLines, headerLines, identityLines } from "../_sections-core.js";
import { footerLines, gitLogLines, workingTreeLines } from "../_sections-repo.js";

const git = (args, cwd) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

const project = mkdtempSync(join(tmpdir(), "rule-handoff-"));

test.before(() => {
  mkdirSync(join(project, "docs", "adr"), { recursive: true });
  mkdirSync(join(project, ".context"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo-proj", description: "A demo project", version: "0.3.1" }));
  writeFileSync(join(project, "docs/adr/001-first.md"), "# 001: First ADR\n\n- **Status**: accepted\n- **Tags**: structure, docs\n\n## Decision\n\nPick the simple structure.\n");
  writeFileSync(join(project, "docs/adr/002-later.md"), "# 002: Later ADR\n- **Status**: proposed\n- **Tags**: cache\n\n## Decision\n\nCache answers.\n");
  writeFileSync(join(project, "docs/adr/skip-me.md"), "# not numbered\n");
  writeFileSync(join(project, ".context/scope.md"), "**scope**: mcp server\n");
  writeFileSync(join(project, ".context/agents_count.md"), "- **agents_count**: 3\n");
  writeFileSync(join(project, "docs/roadmap.md"), "# Roadmap\n");
  writeFileSync(join(project, "docs/CHANGELOG.md"), "# Changelog\n");
  writeFileSync(join(project, "README.md"), "# Demo\n");
  writeFileSync(join(project, "uncommitted.txt"), "clean\n");
  git(["init", "--quiet", "--initial-branch=main"], project);
  git(["config", "user.email", "t@t.t"], project);
  git(["config", "user.name", "t"], project);
  git(["add", "-A"], project);
  git(["commit", "--quiet", "-m", "seed the project"], project);
  writeFileSync(join(project, "uncommitted.txt"), "dirty\n");
});

test.after(() => rmSync(project, { recursive: true, force: true }));

test("readAdrs and readContextValues parse the fixture project", () => {
  const adrs = readAdrs(project);
  assert.equal(adrs.length, 2, "numbered ADRs parse, the index-like file is skipped");
  assert.equal(adrs[0].number, 2, "the newest ADR sorts first");
  assert.equal(adrs.find((a) => a.number === 1).status, "accepted");
  assert.deepEqual(adrs.find((a) => a.number === 1).tags, ["structure", "docs"], "tags split and trim");

  const missing = readAdrs(join(project, "no", "adrs"));
  assert.deepEqual(missing, [], "a missing adr dir reads empty");

  const context = readContextValues(project);
  assert.equal(context.scope, "mcp server", "context keys read");
  assert.equal(context.agents_count, "3", "count keys read");

  assert.deepEqual(readContextValues(join(project, "no", "ctx")), {}, "a missing context dir reads empty");
});

test("readProjectIdentity degrades from package.json", () => {
  const identity = readProjectIdentity(project);
  assert.equal(identity.name, "demo-proj", "the package name reads");
  assert.equal(identity.version, "0.3.1", "the version reads");

  const bare = mkdtempSync(join(tmpdir(), "rule-handoff-bare-"));
  assert.deepEqual(readProjectIdentity(bare), {}, "no package.json means no identity");
  rmSync(bare, { recursive: true, force: true });
});

test("full build renders every section and stats the output", () => {
  const { text, stats } = buildHandoff({
    projectDir: project,
    includeContext: true,
    includeAdrs: true,
    includeIdentity: true,
    includeGitDiff: true,
    includeGitLog: true,
    includeRoadmap: true,
    compress: false,
    maxTokens: 0,
    format: "full",
    mode: "handoff",
  });

  assert.match(text, /## HANDOFF: demo-proj/, "the header names the project");
  assert.match(text, /### Project Identity/, "the identity block renders");
  assert.match(text, /Version: 0\.3\.1/, "the version is carried");
  assert.match(text, /### ADR Log/, "the adr table renders");
  assert.match(text, /\| 001 \| accepted \| First ADR \|.*\| Pick the simple/, "a table row renders");
  assert.match(text, /### Context Snapshot/, "the context block renders");
  assert.match(text, /### Working Tree Changes/, "the uncommitted changes render");
  assert.match(text, /### Recent Commits/, "the commit log renders");
  assert.match(text, /### Documentation Status/, "the docs scan renders");
  assert.match(text, /### Handoff Instruction/, "the footer renders");
  assert.equal(stats.adrs, 2, "the stats count adrs");
  assert.equal(stats.format, "full", "the stats name the format");
  assert.ok(stats.lines > 10, "the stats count lines");
});
