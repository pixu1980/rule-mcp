/** The handoff format ladder: brief, minimal, close-session and the budget degrade. */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { buildHandoff } from "../_build.js";
import { adrLines, contextLines, headerLines, identityLines } from "../_sections-core.js";
import { footerLines, gitLogLines, workingTreeLines } from "../_sections-repo.js";

const project = mkdtempSync(join(tmpdir(), "rule-handoff-fmt-"));

test.before(() => {
  mkdirSync(join(project, "docs", "adr"), { recursive: true });
  mkdirSync(join(project, ".context"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo-proj", description: "A demo project", version: "0.3.1" }));
  writeFileSync(join(project, "docs/adr/001-first.md"), "# 001: First ADR\n\n- **Status**: accepted\n- **Tags**: structure, docs\n\n## Decision\n\nPick the simple structure.\n");
  writeFileSync(join(project, "docs/adr/002-later.md"), "# 002: Later ADR\n- **Status**: proposed\n- **Tags**: cache\n\n## Decision\n\nCache answers.\n");
  writeFileSync(join(project, ".context/scope.md"), "**scope**: mcp server\n");
  writeFileSync(join(project, ".context/agents_count.md"), "- **agents_count**: 3\n");
  writeFileSync(join(project, "docs/roadmap.md"), "# Roadmap\n");
  writeFileSync(join(project, "docs/CHANGELOG.md"), "# Changelog\n");
});

test.after(() => rmSync(project, { recursive: true, force: true }));
test("brief and minimal formats trim the sections", () => {
  const brief = buildHandoff({
    projectDir: project,
    includeContext: true,
    includeAdrs: true,
    includeIdentity: true,
    includeGitDiff: true,
    includeGitLog: true,
    includeRoadmap: true,
    compress: true,
    maxTokens: 0,
    format: "brief",
    mode: "handoff",
  });
  assert.match(brief.text, /Project: demo-proj/, "the brief identity renders");
  assert.doesNotMatch(brief.text, /### Project Identity/, "the full identity block does not");
  assert.match(brief.text, /ADRs \(2\):/, "the brief adr list renders");
  assert.equal(brief.stats.format, "brief", "the format is reported");

  const minimal = buildHandoff({
    projectDir: project,
    includeContext: true,
    includeAdrs: true,
    includeIdentity: true,
    includeGitDiff: false,
    includeGitLog: false,
    includeRoadmap: false,
    compress: true,
    maxTokens: 0,
    format: "minimal",
    mode: "handoff",
  });
  assert.match(minimal.text, /^HANDOFF:demo-proj/, "the minimal header is one line");
  assert.match(minimal.text, /ADRs:2/, "the minimal adr count renders");
  assert.equal(minimal.stats.format, "minimal", "the format is reported");
});

test("a close-session build adds the recovery banner", () => {
  const { text } = buildHandoff({
    projectDir: project,
    includeContext: false,
    includeAdrs: false,
    includeIdentity: false,
    includeGitDiff: false,
    includeGitLog: false,
    includeRoadmap: false,
    compress: true,
    maxTokens: 0,
    format: "full",
    mode: "close-session",
  });
  assert.match(text, /SESSION CLOSE/, "the close banner renders");
  assert.match(text, /### Next Session Recovery/, "the recovery steps render");
});

test("an over-budget build degrades format to its most minimal fit", () => {
  const { stats, text } = buildHandoff({
    projectDir: project,
    includeContext: true,
    includeAdrs: true,
    includeIdentity: true,
    includeGitDiff: true,
    includeGitLog: true,
    includeRoadmap: false,
    compress: false,
    maxTokens: 1,
    format: "full",
    mode: "handoff",
  });
  assert.equal(stats.format, "minimal", "full exceeds the budget and collapses");
  assert.match(text, /^HANDOFF:/, "the collapsed output is minimal");
});

test("the section helpers render their own slots and gap cases", () => {
  assert.deepEqual(headerLines({ projectName: "x", isMinimal: true, isCloseSession: false }), ["HANDOFF:x"], "a minimal header is a single line");
  assert.deepEqual(identityLines({}, { isBrief: false, isMinimal: false }), [], "an empty identity renders nothing");
  assert.ok(adrLines([], { isBrief: false, isMinimal: false }).join("\n").includes("No ADRs recorded"), "an empty adr list says so");
  assert.deepEqual(contextLines({}, {}), [], "an empty context renders nothing");
  assert.deepEqual(workingTreeLines(null, {}), [], "no diff renders nothing");
  assert.deepEqual(gitLogLines(null, { isMinimal: false, isBrief: false }), [], "no log renders nothing");
  assert.ok(footerLines({ projectName: "x", isMinimal: true, isCloseSession: false }).join("\n").includes("Do not re-ask"), "the minimal footer continues work");
});
