

/** Branch coverage for the sync renderer: dirty tree, conflicts, and the base note. */
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { before, test } from "node:test";

process.env.RULE_MCP_NO_CACHE = "1";
process.env.RULE_MCP_NO_TELEMETRY = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-mcp-sync-branches-"));

const { callTool } = await import("../../router/index.js");
const { registerSyncTool } = await import("../_sync.js");
const { commit, makeRepo, remove, run } = await import("../../../core/git/__tests__/_fixture.mjs");

before(() => {
  registerSyncTool();
});

async function text(args) {
  const result = await callTool("rule_tool_sync", args);

  return result.content[0].text;
}

function diverged() {
  const root = makeRepo();
  run(root, "checkout", "-q", "-b", "feat/x");
  commit(root, "feature.txt", "f\n", "feat(x): the feature");
  run(root, "checkout", "-q", "main");
  commit(root, "main.txt", "m\n", "fix(main): drift on the base");
  run(root, "checkout", "-q", "feat/x");

  return root;
}

test("a dirty tree is reported as unsafe and names the remedy", async () => {
  const root = diverged();
  try {
    writeFileSync(join(root, "feature.txt"), "dirty\n");
    const output = await text({ projectDir: root });

    assert.match(output, /NOT safe/u);
    assert.match(output, /Commit or stash/u);
  } finally {
    remove(root);
  }
});

test("a conflicting rebase reports the conflict and never resolves it", async () => {
  const root = makeRepo();
  try {
    run(root, "checkout", "-q", "-b", "feat/x");
    commit(root, "a.txt", "feature\n", "feat(x): feature");
    run(root, "checkout", "-q", "main");
    commit(root, "a.txt", "main\n", "fix(main): main");
    run(root, "checkout", "-q", "feat/x");
    const output = await text({ projectDir: root, action: "rebase", confirm: true });

    assert.match(output, /Conflicts/u);
    assert.match(output, /git rebase --continue|git rebase --abort/u);
  } finally {
    remove(root);
  }
});
