/** WS2 - the rule_tool_sync contract: read-only by default, confirmed to act. */
import { strict as assert } from "node:assert";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { before, test } from "node:test";

process.env.RULE_MCP_NO_CACHE = "1";
process.env.RULE_MCP_NO_TELEMETRY = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-mcp-sync-"));

const { callTool } = await import("../../router/index.js");
const { registerSyncTool } = await import("../_sync.js");
const { commit, makeRepo, remove, run } = await import("../../../core/git/__tests__/_fixture.mjs");

before(() => {
  registerSyncTool();
});

/** A repo whose `main` moved once after `feat/x` forked. */
function diverged() {
  const root = makeRepo();

  run(root, "checkout", "-q", "-b", "feat/x");
  commit(root, "feature.txt", "f\n", "feat(x): the feature");
  run(root, "checkout", "-q", "main");
  commit(root, "main.txt", "m\n", "fix(main): drift on the base");
  run(root, "checkout", "-q", "feat/x");

  return root;
}

/** The text of a tool result. */
async function text(args) {
  const result = await callTool("rule_tool_sync", args);

  return result.content[0].text;
}

test("the default action is a read-only check", async () => {
  const root = diverged();
  const output = await text({ projectDir: root });

  assert.match(output, /Requires rebase: yes/u, "the divergence is reported");
  assert.match(output, /git rebase main/u, "the command is shown");
  assert.match(output, /confirm=true/u, "and the confirmation is spelled out");
  remove(root);
});

test("action=rebase without confirm refuses and does not act", async () => {
  const root = diverged();
  const output = await text({ projectDir: root, action: "rebase" });

  assert.match(output, /Not applied: confirmation required/u, "the gate refuses");
  remove(root);
});

test("action=rebase with confirm applies the rebase", async () => {
  const root = diverged();
  const output = await text({ projectDir: root, action: "rebase", confirm: true });

  assert.match(output, /Rebase applied/u, "the rebase ran");
  assert.match(output, /Commits behind now: 0/u, "and the branch is level with the base");
  remove(root);
});
