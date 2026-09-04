/**
 * @module test/tokensave-branch.test
 *
 * tokensave keeps one code graph per branch. On an untracked branch its server
 * serves the nearest ancestor's DB with a staleness warning; this module turns
 * that condition into a refresh instruction instead of a reason to abandon the
 * graph. The readers are pure filesystem reads over a `.tokensave` directory;
 * the one side-effecting helper is env-gated.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { TOKENSAVE_DIRECTIVE, autoTrackBranch, branchState, enableAutoTrack, staleLine, tokensaveDirective } =
  await import("../src/core/tokensave.js");

/** A git repo with a tokensave metadata file, on the named branch. */
function graphProject({ branch = "feat/x", defaultBranch = "main", branches = {}, config = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), "rule-tokensave-"));
  execFileSync("git", ["init", "-q", "-b", branch], { cwd: root, stdio: "ignore" });
  mkdirSync(join(root, ".tokensave"), { recursive: true });
  writeFileSync(
    join(root, ".tokensave", "branch-meta.json"),
    JSON.stringify({ default_branch: defaultBranch, db_file: "tokensave.db", branches }),
  );
  writeFileSync(join(root, ".tokensave", "config.json"), JSON.stringify(config));

  return root;
}

test("no graph means no branch-awareness", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-tokensave-plain-"));
  assert.deepEqual(branchState(root), {
    present: false,
    branch: null,
    defaultBranch: null,
    tracked: false,
    stale: false,
    autoTrack: false,
  });
  assert.equal(tokensaveDirective(root), "");
  assert.equal(staleLine(root), "");
  rmSync(root, { recursive: true, force: true });
});

test("a tracked branch gets the ACTIVE directive", () => {
  const root = graphProject({ branch: "main", defaultBranch: "main" });
  const state = branchState(root);
  assert.equal(state.present, true);
  assert.equal(state.stale, false);
  assert.equal(tokensaveDirective(root), TOKENSAVE_DIRECTIVE);
  assert.equal(staleLine(root), "");
});

test("an untracked branch gets the refresh instruction, never a grep suggestion", () => {
  const root = graphProject({ branch: "feat/x", defaultBranch: "main" });
  const state = branchState(root);
  assert.equal(state.stale, true);
  const d = tokensaveDirective(root);
  assert.match(d, /tokensave branch add feat\/x/);
  assert.match(d, /Do NOT fall back to grep/, "the directive must warn against abandoning the graph");
  assert.match(staleLine(root), /TOKENSAVE STALE/);
});

test("single-branch metadata is never stale", () => {
  const root = graphProject({ branch: "feat/x", branches: { "feat/x": {} } });
  assert.equal(branchState(root).stale, false);
});

test("enableAutoTrack turns the config on, idempotently", async () => {
  const root = graphProject({ branch: "feat/x" });
  const first = enableAutoTrack(root);
  assert.equal(first.changed, true);
  assert.equal(enableAutoTrack(root).reason, "already enabled");
  const { readFileSync } = await import("node:fs");
  const state = JSON.parse(readFileSync(join(root, ".tokensave", "config.json"), "utf8"));
  assert.equal(state.auto_track, true);
});

test("autoTrackBranch is env-gated and detects staleness", () => {
  const root = graphProject({ branch: "feat/x", defaultBranch: "main" });
  const previous = process.env.RULE_MCP_TOKENSAVE_AUTOTRACK;
  delete process.env.RULE_MCP_TOKENSAVE_AUTOTRACK;
  assert.equal(autoTrackBranch(root).ran, false);

  process.env.RULE_MCP_TOKENSAVE_AUTOTRACK = "1";
  const ran = autoTrackBranch(root);
  assert.equal(ran.ran, true);
  assert.match(ran.reason, /feat\/x/);

  const fresh = graphProject({ branch: "main", defaultBranch: "main" });
  assert.equal(autoTrackBranch(fresh).ran, false);
  assert.match(autoTrackBranch(fresh).reason, /current/);

  if (previous === undefined) {
    delete process.env.RULE_MCP_TOKENSAVE_AUTOTRACK;
  } else {
    process.env.RULE_MCP_TOKENSAVE_AUTOTRACK = previous;
  }
});
