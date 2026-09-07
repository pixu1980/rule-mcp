// URL normalization and allowlist resolution - the pure half of the remote pin.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { normalizeRemoteUrl, resolveAllowedRemotes } from "../index.js";

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
  const manifest = JSON.parse(readFileSync(new URL("../../../../server.json", import.meta.url), "utf8"));
  const declared = manifest.repository.url;
  assert.ok(declared, "server.json must declare a repository url");
  const allowed = resolveAllowedRemotes({});
  assert.ok(allowed.includes(normalizeRemoteUrl(declared)), "server.json declares where updates may come from");
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
