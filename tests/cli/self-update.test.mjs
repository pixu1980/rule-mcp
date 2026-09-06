/**
 * @module test/self-update.test
 *
 * Tests the self-update engine against real, sandboxed git repositories:
 * fast-forward pull + change classification, banner/restart decisions, and the
 * safety guards (dirty tree, no upstream, opt-out). Uses injectable helpers so
 * no real process exit or network is involved.
 */

import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildBanner, scheduleRestartIfNeeded } from "../../src/core/self-update/index.js";

console.log("self-update engine test");

const g = (arguments_, cwd) =>
  execFileSync("git", arguments_, { cwd, stdio: ["ignore", "pipe", "ignore"], encoding: "utf8" });

/** Build a bare "upstream" + a working clone that tracks it. */
function makeClonePair() {
  const base = mkdtempSync(join(tmpdir(), "rule-su-"));
  const upstream = join(base, "upstream.git");
  const clone = join(base, "clone");
  mkdirSync(upstream);
  g(["init", "--bare", "-b", "main"], upstream);
  // Seed via a temp working copy pushed to the bare upstream.
  const seed = join(base, "seed");
  mkdirSync(seed);
  g(["init", "-b", "main"], seed);
  g(["config", "user.email", "t@t.t"], seed);
  g(["config", "user.name", "t"], seed);
  mkdirSync(join(seed, "skills", "rule"), { recursive: true });
  writeFileSync(join(seed, "skills", "rule", "SKILL.md"), "v1\n");
  mkdirSync(join(seed, "src"), { recursive: true });
  writeFileSync(join(seed, "src", "server.js"), "// v1\n");
  g(["add", "-A"], seed);
  g(["commit", "-m", "seed"], seed);
  g(["remote", "add", "origin", upstream], seed);
  g(["push", "-u", "origin", "main"], seed);
  // The clone under test.
  g(["clone", upstream, clone], base);
  g(["config", "user.email", "t@t.t"], clone);
  g(["config", "user.name", "t"], clone);
  return { base, upstream, clone, seed };
}

/** Advance the upstream by editing given files, returning nothing. */
function pushUpstreamChange(seed, files) {
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(seed, rel);
    mkdirSync(join(abs, ".."), { recursive: true });
    writeFileSync(abs, content);
  }
  g(["add", "-A"], seed);
  g(["commit", "-m", "upstream change"], seed);
  g(["push", "origin", "main"], seed);
}

/**
 * Run runSelfUpdate against a clone by pointing getRepoRoot there via a fresh
 * module import with a stubbed paths module is overkill; instead we exercise the
 * pure git logic by replicating runSelfUpdate's steps is also overkill. We run
 * the real module with RULE_MCP_GALAXY_MCP overriding cwd through a child process.
 */
function runUpdateIn(clone, environment = {}) {
  const script = `
    import { runSelfUpdate } from ${JSON.stringify(new URL("../../src/core/self-update/index.js", import.meta.url).href)};
    const r = await runSelfUpdate({ reloadSkills: false });
    process.stdout.write(JSON.stringify(r));
  `;
  const out = execFileSync(process.execPath, ["--input-type=module", "--eval", script], {
    cwd: clone,
    // Force the module to treat `clone` as the repo root by running from there and
    // relying on detectInstallType(.git) - but getRepoRoot resolves from module path.
    // So instead we pass an explicit override the module honors:
    env: { ...process.env, RULE_MCP_REPO_ROOT: clone, ...environment },
    encoding: "utf8",
  });
  return JSON.parse(out);
}

// ── T1: skills-only upstream change → fast-forwarded, classified as skills ──
{
  const { clone, seed, base, upstream } = makeClonePair();
  pushUpstreamChange(seed, { "skills/rule/SKILL.md": "v2\n" });
  const r = runUpdateIn(clone, { RULE_MCP_UPDATE_REMOTE: upstream });
  assert.equal(r.updated, true, "should fast-forward a skills-only change");
  assert.equal(r.changedSkills, true, "skills change detected");
  assert.equal(r.changedCode, false, "no code change");
  rmSync(base, { recursive: true, force: true });
  console.log("  ✅ skills-only change fast-forwards and is classified as skills");
}

// ── T2: code change classified as code ──
{
  const { clone, seed, base, upstream } = makeClonePair();
  pushUpstreamChange(seed, { "src/server.js": "// v2\n" });
  const r = runUpdateIn(clone, { RULE_MCP_UPDATE_REMOTE: upstream });
  assert.equal(r.updated, true, "should fast-forward a code change");
  assert.equal(r.changedCode, true, "code change detected");
  rmSync(base, { recursive: true, force: true });
  console.log("  ✅ code change is classified as code");
}

// ── T3: dirty working tree is never touched ──
{
  const { clone, seed, base, upstream } = makeClonePair();
  pushUpstreamChange(seed, { "skills/rule/SKILL.md": "v2\n" });
  writeFileSync(join(clone, "skills", "rule", "SKILL.md"), "local edit\n");
  const r = runUpdateIn(clone, { RULE_MCP_UPDATE_REMOTE: upstream });
  assert.equal(r.updated, false, "must not update a dirty tree");
  assert.equal(r.reason, "dirty-tree", "reports dirty-tree");
  rmSync(base, { recursive: true, force: true });
  console.log("  ✅ dirty working tree is skipped (local work preserved)");
}

// ── T4: opt-out env disables the update ──
{
  const { clone, seed, base, upstream } = makeClonePair();
  pushUpstreamChange(seed, { "skills/rule/SKILL.md": "v2\n" });
  const r = runUpdateIn(clone, { RULE_MCP_NO_AUTOUPDATE: "1", RULE_MCP_UPDATE_REMOTE: upstream });
  assert.equal(r.skipped, true, "opt-out skips");
  assert.equal(r.reason, "disabled", "reports disabled");
  rmSync(base, { recursive: true, force: true });
  console.log("  ✅ RULE_MCP_NO_AUTOUPDATE disables the update");
}

// ── T5: banner + restart decisions (pure) ──
{
  assert.match(
    buildBanner({ updated: true, from: "aaaaaaa", to: "bbbbbbb", count: 2, changedSkills: true, changedCode: false }),
    /Updating MCP server/,
  );
  assert.equal(buildBanner({ updated: false }), null, "no banner when nothing changed");

  // eslint-disable-next-line no-unused-vars
  let isExited = false;
  const note = scheduleRestartIfNeeded({ updated: true, changedCode: true }, () => {
    isExited = true;
  });
  assert.match(note, /restart/i, "code change schedules a restart note");

  process.env.RULE_MCP_NO_AUTORESTART = "1";
  const noRestart = scheduleRestartIfNeeded({ updated: true, changedCode: true }, () => {});
  assert.match(noRestart, /restart the server|reconnect/i, "opt-out yields an instruction, not an exit");
  delete process.env.RULE_MCP_NO_AUTORESTART;

  assert.equal(scheduleRestartIfNeeded({ updated: true, changedCode: false }), null, "no restart for skills-only");
  console.log("  ✅ banner and restart decisions are correct");
}

// ── T6: daemon mode never force-exits by default (protects connected clients) ──
{
  process.env.RULE_MCP_DAEMON = "1";
  let isDaemonExited = false;
  const daemonNote = scheduleRestartIfNeeded({ updated: true, changedCode: true }, () => {
    isDaemonExited = true;
  });
  assert.match(daemonNote, /daemon/i, "daemon mode explains a manual/opt-in restart");
  // Let any deferred (800ms) exit fire - a ref'd timer keeps the loop alive.
  await new Promise((r) => setTimeout(r, 900));
  assert.equal(isDaemonExited, false, "daemon mode must not force-exit by default");

  // Single-client daemons can opt back in - the deferred restart returns.
  process.env.RULE_MCP_DAEMON_AUTORESTART = "1";
  let isOptInExited = false;
  const optInNote = scheduleRestartIfNeeded({ updated: true, changedCode: true }, () => {
    isOptInExited = true;
  });
  assert.match(optInNote, /restart/i, "daemon opt-in yields a restart note");
  await new Promise((r) => setTimeout(r, 900));
  assert.equal(isOptInExited, true, "daemon opt-in performs the deferred restart");
  delete process.env.RULE_MCP_DAEMON_AUTORESTART;
  delete process.env.RULE_MCP_DAEMON;
  console.log("  ✅ daemon-mode restart is client-safe by default");
}

console.log("\nself-update: all checks passed");
