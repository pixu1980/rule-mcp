

/**
 * The sync verdicts the happy path never produces: a directory that is not a
 * repository at all, an empty project path, and a rebase that git stopped on a
 * conflict it had already resolved from its rerere cache.
 *
 * The last one is the case the renderer exists for: `conflicted` comes from the
 * rebase state, the file list comes from git's index, and when git lists no
 * unmerged file the report has to say so rather than invent one.
 */
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { before, test } from "node:test";

process.env.RULE_MCP_NO_CACHE = "1";
process.env.RULE_MCP_NO_TELEMETRY = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
process.env.RULE_MCP_NO_COMPRESSION = "1";
process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-sync-extra-"));
// The first pass over a conflict commits with the message git already has; an
// editor in a non-interactive test would wait forever.
process.env.GIT_EDITOR = "true";

const { callTool } = await import("../../router/index.js");
const { registerSyncTool } = await import("../_sync.js");
const { commit, makeRepo, remove, run } = await import("../../../core/git/__tests__/_fixture.mjs");

before(() => {
  registerSyncTool();
});

/** The text of a tool result. */
async function text(args) {
  const result = await callTool("rule_tool_sync", args);

  return result.content[0].text;
}

/** A repository whose feature branch conflicts with the base on `a.txt`. */
function conflicting() {
  const root = makeRepo();

  run(root, "config", "rerere.enabled", "true");
  run(root, "config", "rerere.autoupdate", "true");
  run(root, "checkout", "-q", "-b", "feat/x");
  commit(root, "a.txt", "feature\n", "feat(x): the feature");
  run(root, "checkout", "-q", "main");
  commit(root, "a.txt", "main\n", "fix(main): the base moved");
  run(root, "checkout", "-q", "feat/x");

  return root;
}

test("a directory that is not a repository says so instead of guessing a base", async () => {
  const root = mkdtempSync(join(tmpdir(), "rule-sync-not-a-repo-"));

  try {
    const output = await text({ projectDir: root });

    assert.match(output, /Base branch: {5}\(none\)/u, "there is no base to name");
    assert.match(output, /Merge base: {6}-/u, "and no fork point to print");
    assert.match(output, /Requires rebase: no/u, "no base is not a divergence");
    assert.match(output, /Note: {12}no base branch/u, "the reason the check could not answer is stated");
    assert.match(output, /NOT safe - not a git repository/u, "and the tree is not offered as safe to rewrite");
  } finally {
    remove(root);
  }
});

test("an empty project path falls back to the current directory", async () => {
  const explicit = await text({ projectDir: "" });
  const fallback = await text({});

  assert.equal(explicit, fallback, "an empty path means the schema default, not a path of its own");
  assert.match(explicit, /# rule_tool_sync - check/u, "and it is still a check");
});

test("a rebase git stopped on an already-resolved conflict reports the conflict and no file", async () => {
  const root = conflicting();

  try {
    const before = run(root, "rev-parse", "HEAD");

    // First pass: teach rerere the resolution, the way a person would.
    try {
      run(root, "rebase", "main");
    } catch {
      /* the conflict is the point */
    }

    assert.equal(run(root, "diff", "--name-only", "--diff-filter=U"), "a.txt", "the fixture really conflicts");
    writeFileSync(join(root, "a.txt"), "resolved\n");
    run(root, "add", "a.txt");
    run(root, "rebase", "--continue");
    run(root, "reset", "--hard", "-q", before);

    // Second pass: rerere stages the resolution, and git still stops.
    const output = await text({ projectDir: root, action: "rebase", confirm: true });

    assert.match(output, /Not applied: rebase stopped/u, "a stopped rebase is not reported as applied");
    assert.match(output, /Conflicts \(left unresolved\):/u, "the conflict is named");
    assert.match(output, /\(git listed none\)/u, "with no unmerged file, the report says git listed none instead of inventing one");
    assert.match(output, /git rebase --continue/u, "and leaves the resolution to the person");
    assert.equal(run(root, "diff", "--name-only", "--diff-filter=U"), "", "git is the source: it lists no unmerged file here");
  } finally {
    remove(root);
  }
});
