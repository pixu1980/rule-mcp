

// Phantom update: a branch ahead of upstream is not an update, and banners stay honest.
import test from "node:test";
import assert from "node:assert/strict";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { git, makeClonePair, runUpdateIn } from "./_pin.fixture.mjs";

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
    assert.equal(git(["merge", "--ff-only", "@{u}"], clone).trim(), "Already up to date.", "git must report a no-op merge with exit 0");

    const result = runUpdateIn(clone, { RULE_MCP_UPDATE_REMOTE: upstream });
    assert.equal(result.reason, undefined, `must reach the merge, not bail out early (got ${result.reason})`);
    assert.equal(result.updated, false, "HEAD did not move, so nothing was updated");
    assert.equal(result.from, undefined, "no commit range for a no-op");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("buildBanner stays silent for a no-op check", async () => {
  const { buildBanner } = await import("../index.js");
  assert.equal(buildBanner({ checked: true, updated: false }), null);
});

test("the update banner does not say 'files file(s)'", async () => {
  const { buildBanner } = await import("../index.js");
  const banner = buildBanner({ updated: true, from: "aaaaaaa", to: "bbbbbbb", count: 3 });
  assert.doesNotMatch(banner, /files file/);
  assert.match(banner, /3 file\(s\)/);
});
