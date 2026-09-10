

/**
 * T7-T13: every skip reason and merge decision runSelfUpdate can return, on
 * real sandboxed repositories. engine.test.mjs owns the happy path and the
 * dirty/disabled guards; this file completes the branch surface.
 */
import { strict as assert } from "node:assert";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { g, makeClonePair, pushUpstreamChange, runUpdateIn } from "./_update.fixture.mjs";

// ── T7: detached HEAD never updates ──
{
  const { clone, base, upstream } = makeClonePair();
  g(["checkout", "--detach"], clone);
  const r = runUpdateIn(clone, { RULE_MCP_UPDATE_REMOTE: upstream });
  assert.equal(r.reason, "detached-head", "detached HEAD is skipped");
  rmSync(base, { recursive: true, force: true });
  console.log("  ✅ detached HEAD is reported and skipped");
}

// ── T8: a branch with no upstream is skipped ──
{
  const { clone, base, upstream } = makeClonePair();
  g(["branch", "--unset-upstream"], clone);
  const r = runUpdateIn(clone, { RULE_MCP_UPDATE_REMOTE: upstream });
  assert.equal(r.reason, "no-upstream", "no @{u} is reported");
  rmSync(base, { recursive: true, force: true });
  console.log("  ✅ a branch without upstream is reported and skipped");
}

// ── T9: the allowlist gates the remote identity in both directions ──
{
  const { clone, base, upstream } = makeClonePair();
  const denied = runUpdateIn(clone, { RULE_MCP_UPDATE_REMOTE: "/tmp/some-other-repo.git" });
  assert.equal(denied.reason, "remote-not-allowed", "an unlisted remote is refused");

  const none = runUpdateIn(clone, { RULE_MCP_UPDATE_REMOTE: "  " });
  assert.equal(none.reason, "no-allowed-remote", "an empty allowlist is refused");

  rmSync(base, { recursive: true, force: true });
  console.log("  ✅ the remote allowlist is enforced in both directions");
}

// ── T10: a rewritten origin is refused before any network call ──
{
  const { clone, base, upstream } = makeClonePair();
  g(["remote", "set-url", "origin", "/nonexistent/upstream.git"], clone);
  const r = runUpdateIn(clone, { RULE_MCP_UPDATE_REMOTE: upstream });
  assert.equal(r.reason, "remote-not-allowed", "the rewritten remote is refused");
  rmSync(base, { recursive: true, force: true });
  console.log("  ✅ an unlisted origin URL is refused before fetch");
}

// ── T11: a corrupt index fails safe instead of crashing the check ──
{
  const { clone, base, upstream } = makeClonePair();
  writeFileSync(join(clone, ".git", "index"), "corrupt index", "utf8");
  const r = runUpdateIn(clone, { RULE_MCP_UPDATE_REMOTE: upstream });
  assert.equal(r.reason, "git-error", "a corrupt index surfaces as git-error");
  rmSync(base, { recursive: true, force: true });
  console.log("  ✅ a corrupt index fails safe with git-error");
}

// ── T12: an unreachable origin fails open instead of hanging the session ──
{
  const { clone, base, upstream } = makeClonePair();
  g(["remote", "set-url", "origin", "/nonexistent/upstream.git"], clone);
  const r = runUpdateIn(clone, { RULE_MCP_UPDATE_REMOTE: "/nonexistent/upstream.git" });
  assert.equal(r.reason, "fetch-failed", "an unreachable remote reports fetch-failed");
  rmSync(base, { recursive: true, force: true });
  console.log("  ✅ an unreachable origin fails open with fetch-failed");
}

// ── T13: upstream commits are refused when signatures are required ──
{
  const { clone, seed, base, upstream } = makeClonePair();
  pushUpstreamChange(seed, { "src/server/index.js": "// v2\n" });
  const r = runUpdateIn(clone, { RULE_MCP_UPDATE_REMOTE: upstream, RULE_MCP_UPDATE_REQUIRE_SIGNATURE: "1" });
  assert.equal(r.reason, "unsigned-upstream", "an unsigned upstream commit is refused");
  rmSync(base, { recursive: true, force: true });
  console.log("  ✅ unsigned upstream is refused under REQUIRE_SIGNATURE");
}

// ── T14: up-to-date, ahead-of-upstream and divergent histories ──
{
  // Already up to date: no upstream change.
  const { clone, base, upstream } = makeClonePair();
  const same = runUpdateIn(clone, { RULE_MCP_UPDATE_REMOTE: upstream });
  assert.deepEqual(same, { checked: true, updated: false }, "up-to-date reports no update and no reason");
  rmSync(base, { recursive: true, force: true });

  // Local branch ahead of upstream: merge no-ops and HEAD must not move.
  const { clone: clone2, base: base2, upstream: upstream2 } = makeClonePair();
  g(["config", "user.email", "t@t.t"], clone2);
  g(["config", "user.name", "t"], clone2);
  writeFileSync(join(clone2, "local.txt"), "local\n");
  g(["add", "-A"], clone2);
  g(["commit", "-m", "local ahead"], clone2);
  const before2 = g(["rev-parse", "HEAD"], clone2).trim();
  const ahead = runUpdateIn(clone2, { RULE_MCP_UPDATE_REMOTE: upstream2 });
  assert.equal(ahead.updated, false, "ahead of upstream never claims an update");
  const after2 = g(["rev-parse", "HEAD"], clone2).trim();
  assert.equal(before2, after2, "HEAD is untouched by the no-op merge");
  rmSync(base2, { recursive: true, force: true });

  // Divergent history: fast-forward is impossible and the tree is untouched.
  const { clone: clone3, seed: seed3, base: base3, upstream: upstream3 } = makeClonePair();
  g(["config", "user.email", "t@t.t"], clone3);
  g(["config", "user.name", "t"], clone3);
  writeFileSync(join(clone3, "divergent.txt"), "mine\n");
  g(["add", "-A"], clone3);
  g(["commit", "-m", "local commit"], clone3);
  pushUpstreamChange(seed3, { "src/server/index.js": "// v2\n" });
  const divergent = runUpdateIn(clone3, { RULE_MCP_UPDATE_REMOTE: upstream3 });
  assert.equal(divergent.reason, "not-fast-forward", "divergent history is refused");
  rmSync(base3, { recursive: true, force: true });
  console.log("  ✅ up-to-date, ahead, and divergent histories each decide correctly");
}

// ── T15: a skills-only update reloads the skill catalog when enabled ──
{
  const { clone, seed, base, upstream } = makeClonePair();
  pushUpstreamChange(seed, { "skills/rule/SKILL.md": "v2\n" });
  const r = runUpdateIn(clone, { RULE_MCP_UPDATE_REMOTE: upstream }, true);
  assert.equal(r.updated, true, "skills change still fast-forwards with reload enabled");
  assert.equal(r.changedSkills, true, "skills change classified");
  rmSync(base, { recursive: true, force: true });
  console.log("  ✅ skills reload runs after a skills-only fast-forward");
}
