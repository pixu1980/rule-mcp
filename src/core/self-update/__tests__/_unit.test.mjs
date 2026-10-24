

// URL normalization and allowlist resolution - the pure half of the remote pin.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { normalizeRemoteUrl, resolveAllowedRemotes } from "../index.js";

// ── URL normalization ──────────────────────────────────────────────────────

test("scp-style SSH and HTTPS forms of the same repo normalize equally", () => {
  const ssh = normalizeRemoteUrl("git@github.com:rule-mcp/rule-mcp.git");
  const https = normalizeRemoteUrl("https://github.com/rule-mcp/rule-mcp");
  assert.equal(ssh, https, "the repo's real remote must match the declared one");
});

test("normalization ignores .git suffix, trailing slash, case, and credentials", () => {
  const canonical = normalizeRemoteUrl("https://github.com/rule-mcp/x");
  for (const variant of [
    "https://github.com/rule-mcp/x.git",
    "https://github.com/rule-mcp/x/",
    "https://GitHub.com/rule-mcp/x",
    "https://user:token@github.com/rule-mcp/x.git",
    "ssh://git@github.com/rule-mcp/x.git",
  ]) {
    assert.equal(normalizeRemoteUrl(variant), canonical, `${variant} must normalise to the canonical form`);
  }
});

test("different hosts and different paths never normalize equally", () => {
  const good = normalizeRemoteUrl("https://github.com/rule-mcp/x");
  assert.notEqual(normalizeRemoteUrl("https://evil.example/rule-mcp/x"), good);
  assert.notEqual(normalizeRemoteUrl("https://github.com/rule-mcp/y"), good);
  assert.notEqual(normalizeRemoteUrl("https://notgithub.com/rule-mcp/x"), good);
});

test("an unusable remote value normalizes to null rather than matching anything", () => {
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
