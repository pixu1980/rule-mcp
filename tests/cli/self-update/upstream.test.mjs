/**
 * T16-T18: where the update source comes from - install type, remote identity,
 * and the tracked branch - plus the hints each skip surfaces.
 */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { g, makeClonePair, runUpdateIn } from "./_update.fixture.mjs";

// ── T16: non-git installs are skipped with a manual-update hint ──
{
  const base = mkdtempSync(join(tmpdir(), "rule-su-npm-"));
  const npm = join(base, "node_modules");
  mkdirSync(npm, { recursive: true });
  const r = runUpdateIn(npm, {});
  assert.equal(r.reason, "npm", "a node_modules install reports npm");
  assert.match(r.note, /pnpm add -g/, "npm installs get the pnpm hint");
  rmSync(base, { recursive: true, force: true });
  console.log("  ✅ non-git npm installs are skipped with the pnpm hint");
}

// ── T17: docker installs are skipped with the compose hint ──
{
  const base = mkdtempSync(join(tmpdir(), "rule-su-docker-"));
  const r = runUpdateIn(base, { RULE_MCP_DOCKER: "1" });
  assert.equal(r.reason, "docker", "RULE_MCP_DOCKER reports docker");
  assert.match(r.note, /docker compose pull/, "docker installs get the compose hint");
  rmSync(base, { recursive: true, force: true });
  console.log("  ✅ docker installs are skipped with the compose hint");
}

// ── T18: a tracked local branch (upstream without a slash) still checks out ──
{
  const { clone, base, upstream } = makeClonePair();
  g(["branch", "local-up"], clone);
  g(["config", "branch.local-up.remote", "."], clone);
  g(["config", "branch.local-up.merge", "refs/heads/main"], clone);
  g(["checkout", "-q", "local-up"], clone);
  const r = runUpdateIn(clone, { RULE_MCP_UPDATE_REMOTE: upstream });
  assert.equal(r.updated, false, "a local upstream that matches HEAD reports no update");
  rmSync(base, { recursive: true, force: true });
  console.log("  ✅ a local tracked branch resolves its upstream without a slash");
}

// ── T19: an unusable remote identity means no fetch ──
{
  const { clone, base, upstream } = makeClonePair();
  g(["config", "remote.origin.url", "git://"], clone);

  const denied = runUpdateIn(clone, { RULE_MCP_UPDATE_REMOTE: upstream });
  assert.equal(denied.reason, "remote-not-allowed", "an unparseable identity is refused");

  const none = runUpdateIn(clone, { RULE_MCP_UPDATE_REMOTE: "  " });
  assert.equal(none.reason, "no-allowed-remote", "no identity + empty allowlist reports no-allowed-remote");

  rmSync(base, { recursive: true, force: true });
  console.log("  ✅ an unusable remote identity fails the identity gate with reasons");
}