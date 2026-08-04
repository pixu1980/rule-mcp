// test/self-update-remote-pin.test.mjs
//
// Audit finding 06 — the forced self-update fetches and fast-forwards on every
// tool call, then hot-reloads skills and schedules a restart into the new code.
// It verified nothing about WHERE the code came from: no remote allowlist, no
// signature. Anyone able to write one line into .git/config (a dependency
// postinstall, a shared box, a .git baked into an image) got code execution in
// the MCP server at the next tool call, unprompted.
//
// The fix pins the upstream: the remote URL must match what the shipped
// server.json declares, or an explicit RULE_MCP_UPDATE_REMOTE override.
// URL comparison has to survive the forms git actually uses — this repo's own
// remote is scp-style SSH while server.json declares HTTPS.
//
// Signature verification is available but opt-in: most repositories do not sign
// commits, and defaulting it on would silently stop every update.

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { normalizeRemoteUrl, resolveAllowedRemotes } from "../src/core/self-update.js";

// ── URL normalisation ──────────────────────────────────────────────────────

test("scp-style SSH and HTTPS forms of the same repo normalise equally", () => {
  const ssh = normalizeRemoteUrl("git@github.com:rule/rule-mcp.git");
  const https = normalizeRemoteUrl("https://github.com/rule/rule-mcp");
  assert.equal(ssh, https, "the repo's real remote must match the declared one");
});

test("normalisation ignores .git suffix, trailing slash, case, and credentials", () => {
  const canonical = normalizeRemoteUrl("https://github.com/rule/x");
  for (const variant of [
    "https://github.com/rule/x.git",
    "https://github.com/rule/x/",
    "https://GitHub.com/rule/x",
    "https://user:token@github.com/rule/x.git",
    "ssh://git@github.com/rule/x.git",
  ]) {
    assert.equal(normalizeRemoteUrl(variant), canonical, `${variant} must normalise to the canonical form`);
  }
});

test("different hosts and different paths never normalise equally", () => {
  const good = normalizeRemoteUrl("https://github.com/rule/x");
  assert.notEqual(normalizeRemoteUrl("https://evil.example/rule/x"), good);
  assert.notEqual(normalizeRemoteUrl("https://github.com/rule/y"), good);
  assert.notEqual(normalizeRemoteUrl("https://notgithub.com/rule/x"), good);
});

test("an unusable remote value normalises to null rather than matching anything", () => {
  for (const bad of ["", " ".repeat(3), null, undefined]) {
    assert.equal(normalizeRemoteUrl(bad), null);
  }
});

// ── Allowlist resolution ───────────────────────────────────────────────────

test("the shipped server.json repository is trusted by default", () => {
  const allowed = resolveAllowedRemotes({});
  assert.ok(
    allowed.includes(normalizeRemoteUrl("https://github.com/rule/rule-mcp")),
    "server.json declares where updates may come from",
  );
});

test("the env override replaces the declared remote and accepts a list", () => {
  const allowed = resolveAllowedRemotes({
    RULE_MCP_UPDATE_REMOTE: "https://example.com/a, https://example.com/b",
  });
  assert.deepEqual(
    allowed,
    [normalizeRemoteUrl("https://example.com/a"), normalizeRemoteUrl("https://example.com/b")],
    "an explicit override is the whole allowlist, not an addition",
  );
});

// ── End to end against real sandboxed repositories ─────────────────────────

const git = (arguments_, cwd) =>
  execFileSync("git", arguments_, { cwd, stdio: ["ignore", "pipe", "ignore"], encoding: "utf8" });

/** A bare upstream plus a clone that tracks it, with one upstream commit ahead. */
function makeClonePair() {
  const base = mkdtempSync(join(tmpdir(), "rule-pin-"));
  const upstream = join(base, "upstream.git");
  const seed = join(base, "seed");
  const clone = join(base, "clone");
  mkdirSync(upstream);
  git(["init", "--bare", "-b", "main"], upstream);
  mkdirSync(seed);
  git(["init", "-b", "main"], seed);
  git(["config", "user.email", "t@t.t"], seed);
  git(["config", "user.name", "t"], seed);
  mkdirSync(join(seed, "skills", "rule"), { recursive: true });
  writeFileSync(join(seed, "skills", "rule", "SKILL.md"), "v1\n");
  git(["add", "-A"], seed);
  git(["commit", "-m", "seed"], seed);
  git(["remote", "add", "origin", upstream], seed);
  git(["push", "-u", "origin", "main"], seed);
  git(["clone", upstream, clone], base);
  git(["config", "user.email", "t@t.t"], clone);
  git(["config", "user.name", "t"], clone);
  // Move the upstream forward so there is something to fast-forward to.
  writeFileSync(join(seed, "skills", "rule", "SKILL.md"), "v2\n");
  git(["add", "-A"], seed);
  git(["commit", "-m", "upstream change"], seed);
  git(["push", "origin", "main"], seed);
  return { base, upstream, clone };
}

/** Run the real runSelfUpdate against `clone` in a child process. */
function runUpdateIn(clone, environment = {}) {
  const script = `
    import { runSelfUpdate } from ${JSON.stringify(new URL("../src/core/self-update.js", import.meta.url).href)};
    process.stdout.write(JSON.stringify(await runSelfUpdate({ reloadSkills: false })));
  `;
  const out = execFileSync(process.execPath, ["--input-type=module", "--eval", script], {
    cwd: clone,
    env: { ...process.env, RULE_MCP_REPO_ROOT: clone, ...environment },
    encoding: "utf8",
  });
  return JSON.parse(out);
}

test("an upstream on the allowed remote fast-forwards", () => {
  const { base, upstream, clone } = makeClonePair();
  try {
    const result = runUpdateIn(clone, { RULE_MCP_UPDATE_REMOTE: upstream });
    assert.equal(result.updated, true, "the declared remote is trusted");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("a repointed remote is refused instead of executed", () => {
  const { base, clone } = makeClonePair();
  try {
    const result = runUpdateIn(clone, { RULE_MCP_UPDATE_REMOTE: "https://github.com/rule/other" });
    assert.equal(result.updated, false, "an unrecognised remote must never be merged");
    assert.equal(result.reason, "remote-not-allowed");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("a refused remote is reported to the user, not swallowed", async () => {
  const { buildBanner } = await import("../src/core/self-update.js");
  const banner = buildBanner({
    checked: true,
    updated: false,
    skipped: true,
    reason: "remote-not-allowed",
    remote: "https://evil.example/x",
  });
  assert.ok(banner, "silence would hide a repointed remote");
  assert.match(banner, /remote/i);
});

test("requiring signatures blocks an unsigned upstream", () => {
  const { base, upstream, clone } = makeClonePair();
  try {
    const result = runUpdateIn(clone, {
      RULE_MCP_UPDATE_REMOTE: upstream,
      RULE_MCP_UPDATE_REQUIRE_SIGNATURE: "1",
    });
    assert.equal(result.updated, false, "unsigned upstream must not be merged when signatures are required");
    assert.equal(result.reason, "unsigned-upstream");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

// ── Phantom update ─────────────────────────────────────────────────────────

test("a branch ahead of upstream reports no update", () => {
  const { base, upstream, clone } = makeClonePair();
  try {
    git(["fetch", "--quiet"], clone);
    git(["merge", "--ff-only", "@{u}"], clone);
    writeFileSync(join(clone, "local-only.md"), "local work\n");
    git(["add", "--", "local-only.md"], clone);
    git(["commit", "-m", "local commit"], clone);
    git(["update-index", "--refresh"], clone);

    assert.equal(git(["status", "--porcelain", "--untracked-files=no"], clone).trim(), "", "tree must be clean");
    assert.equal(git(["rev-list", "--count", "@{u}..HEAD"], clone).trim(), "1", "HEAD must be ahead of upstream");
    assert.equal(
      git(["merge", "--ff-only", "@{u}"], clone).trim(),
      "Already up to date.",
      "git must report a no-op merge with exit 0",
    );

    const result = runUpdateIn(clone, { RULE_MCP_UPDATE_REMOTE: upstream });
    assert.equal(result.reason, undefined, `must reach the merge, not bail out early (got ${result.reason})`);
    assert.equal(result.updated, false, "HEAD did not move, so nothing was updated");
    assert.equal(result.from, undefined, "no commit range for a no-op");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("buildBanner stays silent for a no-op check", async () => {
  const { buildBanner } = await import("../src/core/self-update.js");
  assert.equal(buildBanner({ checked: true, updated: false }), null);
});

test("the update banner does not say 'files file(s)'", async () => {
  const { buildBanner } = await import("../src/core/self-update.js");
  const banner = buildBanner({ updated: true, from: "aaaaaaa", to: "bbbbbbb", count: 3 });
  assert.doesNotMatch(banner, /files file/);
  assert.match(banner, /3 file\(s\)/);
});
