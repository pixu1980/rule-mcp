

/** WS4 - the rule_tool_git contract: read-only audit, --force never bypasses confirm. */
import { strict as assert } from "node:assert";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { before, test } from "node:test";

process.env.RULE_MCP_NO_CACHE = "1";
process.env.RULE_MCP_NO_TELEMETRY = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-git-tool-"));

const { callTool } = await import("../../router/index.js");
const { registerGitTool } = await import("../_git.js");
const { headSha } = await import("../../../core/git/index.js");
const { commit, makeRepo, remove, run } = await import("../../../core/git/__tests__/_fixture.mjs");

before(() => {
  registerGitTool();
});

/** The text of a rule_tool_git result. */
async function text(args) {
  const result = await callTool("rule_tool_git", args);

  return result.content[0].text;
}

/** A feature branch with one bad message. */
function feature() {
  const root = makeRepo();

  run(root, "checkout", "-q", "-b", "feat/x");
  commit(root, "a.txt", "a\n", "feat(x): good");
  const bad = commit(root, "b.txt", "b\n", "added without a type");

  return { root, bad };
}

test("the default action audits the feature history", async () => {
  const { root } = feature();
  const output = await text({ projectDir: root });

  assert.match(output, /rule_tool_git - audit/u, "the audit is rendered");
  assert.match(output, /CC violations:\s+1/u, "the violation count is reported");
  assert.match(output, /Merge commits:\s+0/u, "and the merge count");
  remove(root);
});

test("linearize without force is refused as a proposal", async () => {
  const { root } = feature();
  const output = await text({ projectDir: root, action: "linearize" });

  assert.match(output, /Refused/u, "the tool refuses to propose without --force");
  assert.match(output, /force: true/u, "and names the flag");
  remove(root);
});

test("--force enables the linearize proposal but not the gate", async () => {
  const { root } = feature();
  const output = await text({ projectDir: root, action: "linearize", force: true });

  assert.match(output, /Not applied: confirmation required/u, "force does not bypass the confirmation gate");
  remove(root);
});

test("reword without confirmation shows OLD -> NEW", async () => {
  const { root, bad } = feature();
  const output = await text({ projectDir: root, action: "reword", rewrites: [{ sha: bad, message: "feat(x): second" }] });

  assert.match(output, /OLD -> NEW/u, "the change is shown");
  assert.match(output, /added without a type/u, "the old subject is quoted");
  assert.match(output, /feat\(x\): second/u, "and the new one");
  assert.match(output, /Not applied: confirmation required/u, "nothing is applied yet");
  remove(root);
});

test("an unconfirmed reword leaves the branch where it was", async () => {
  const { root, bad } = feature();
  const before = headSha(root);

  await text({ projectDir: root, action: "reword", rewrites: [{ sha: bad, message: "feat(x): second" }] });

  assert.equal(headSha(root), before, "the branch did not move");
  remove(root);
});
