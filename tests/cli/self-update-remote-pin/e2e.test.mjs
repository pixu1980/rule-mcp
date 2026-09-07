// End to end against real sandboxed repositories: the pin enforced by runSelfUpdate.
import test from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";

import { makeClonePair, runUpdateIn } from "./_pin.fixture.mjs";

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
  const { buildBanner } = await import("../../../src/core/self-update/index.js");
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
