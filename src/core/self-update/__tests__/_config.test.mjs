/** The update-policy primitives: throttle parsing, remote identity, allowlists. */
import { strict as assert } from "node:assert";
import test from "node:test";

import { intervalMs, declaredRepository, normalizeRemoteUrl, resolveAllowedRemotes, manualHint } from "../_config.js";

test("intervalMs: unset, empty and invalid inputs fall back to 60s", () => {
  for (const raw of [undefined, "", "abc", "-5", "NaN"]) {
    if (raw === undefined) {
      delete process.env.RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS;
    } else {
      process.env.RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS = raw;
    }
    assert.equal(intervalMs(), 60_000, `raw=${String(raw)} defaults to 60000`);
  }
});

test("intervalMs: zero disables throttling and positives convert seconds", () => {
  process.env.RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS = "0";
  assert.equal(intervalMs(), 0);

  process.env.RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS = "10";
  assert.equal(intervalMs(), 10_000);

  process.env.RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS = "0.5";
  assert.equal(intervalMs(), 500);

  delete process.env.RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS;
});

test("normalizeRemoteUrl: unusable inputs match nothing", () => {
  assert.equal(normalizeRemoteUrl(), null);
  assert.equal(normalizeRemoteUrl(null), null);
  assert.equal(normalizeRemoteUrl(42), null);
  assert.equal(normalizeRemoteUrl(" ".repeat(3)), null);
});

test("normalizeRemoteUrl: local paths keep their location", () => {
  assert.equal(normalizeRemoteUrl("/tmp/repo.git/"), "/tmp/repo.git");
  assert.equal(normalizeRemoteUrl("./relative"), "./relative");
  assert.equal(normalizeRemoteUrl("file:///tmp/repo"), "/tmp/repo");
  assert.equal(normalizeRemoteUrl("file:///"), null, "a bare root has no identity");
});

test("normalizeRemoteUrl: scp-style and https spellings reduce to host/path", () => {
  assert.equal(normalizeRemoteUrl("git@github.com:owner/repo.git"), "github.com/owner/repo");
  assert.equal(normalizeRemoteUrl("https://github.com/owner/repo.git"), "github.com/owner/repo");
  assert.equal(normalizeRemoteUrl("https://user:pass@github.com:8443/owner/repo.git"), "github.com/owner/repo", "credentials, scheme and port strip");
  assert.equal(normalizeRemoteUrl("ssh://git@github.com/owner/repo.git"), "github.com/owner/repo");
  assert.equal(normalizeRemoteUrl("git://host/only"), "host/only");
});

test("resolveAllowedRemotes: override replaces the default, empties are dropped", () => {
  const explicit = resolveAllowedRemotes({ RULE_MCP_UPDATE_REMOTE: "https://github.com/a/b.git, /tmp/c" });
  assert.deepEqual(explicit, ["github.com/a/b", "/tmp/c"]);

  const blank = resolveAllowedRemotes({ RULE_MCP_UPDATE_REMOTE: "  , ," });
  assert.deepEqual(blank, [], "a blank override yields no allowed remotes");
});

test("resolveAllowedRemotes: without an override the declared repository is the only source", () => {
  const all = resolveAllowedRemotes({});
  assert.ok(!all.includes(null), "declared-source results are normalized");
});

test("declaredRepository returns the shipped repository URL", () => {
  assert.match(declaredRepository() ?? "", /github\.com/);
});

test("manualHint names the right command per install type", () => {
  assert.match(manualHint("npm"), /scripts\/install\.sh/);
  assert.match(manualHint("docker"), /docker compose pull/);
  assert.match(manualHint("binary"), /git-clone installs/);
});
