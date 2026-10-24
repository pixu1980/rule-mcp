/** WS2.2 - the event-driven guard: throttled checks, one notice per divergence. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { consumeSyncNotice, freshnessNotice, maybeSyncCheck, resetSyncGuard, syncGuardEnabled } from "../index.js";
import { commit, makeRepo, remove, run } from "../../git/__tests__/_fixture.mjs";

// The suite runner disables the guard for determinism; this suite tests it.
delete process.env.RULE_MCP_NO_SYNC_GUARD;

/** Run with a mocked clock so the throttle can be stepped over without waiting. */
async function withClock(ms, body) {
  const real = Date.now;
  let clock = ms;

  Date.now = () => clock;

  try {
    return await body(() => {
      clock += 10_000;
    });
  } finally {
    Date.now = real;
  }
}

test("a divergence is announced once, then stays quiet", async () => {
  const root = makeRepo({ seed: false });

  commit(root, "a.txt", "a\n", "feat(a): first");

  run(root, "checkout", "-q", "-b", "feat/x");
  commit(root, "f.txt", "f\n", "feat(x): the feature");

  run(root, "checkout", "-q", "main");
  commit(root, "m.txt", "m\n", "fix(main): drift");

  run(root, "checkout", "-q", "feat/x");

  await withClock(1000, async (tick) => {
    resetSyncGuard();

    const first = await maybeSyncCheck(root);

    assert.equal(first.requiresRebase, true, "the check sees the divergence");
    const notice = consumeSyncNotice();

    assert.match(notice, /Base branch main/u, "the notice names the base");
    assert.equal(consumeSyncNotice(), null, "and consumed exactly once");

    tick();
    await maybeSyncCheck(root);

    assert.equal(consumeSyncNotice(), null, "the same divergence is not announced again");
  });

  remove(root);
});

test("a level branch leaves no notice", async () => {
  const root = makeRepo();

  run(root, "checkout", "-q", "-b", "feat/x");
  commit(root, "f.txt", "f\n", "feat(x): work");

  resetSyncGuard();
  await maybeSyncCheck(root);

  assert.equal(consumeSyncNotice(), null, "nothing to report means nothing is left");
  remove(root);
});

test("the guard is off when the environment disables it", async () => {
  const root = makeRepo();
  const previous = process.env.RULE_MCP_NO_SYNC_GUARD;

  process.env.RULE_MCP_NO_SYNC_GUARD = "1";

  try {
    assert.equal(syncGuardEnabled(), false, "the switch reports disabled");
    resetSyncGuard();

    assert.equal(maybeSyncCheck(root), undefined, "no check is kicked");
  } finally {
    if (previous === undefined) {
      delete process.env.RULE_MCP_NO_SYNC_GUARD;
    } else {
      process.env.RULE_MCP_NO_SYNC_GUARD = previous;
    }

    remove(root);
  }
});

test("the notice names the distance and the way out", () => {
  const notice = freshnessNotice({ baseRef: "origin/main", behind: 3, ahead: 1, requiresRebase: true });

  assert.match(notice, /origin\/main/u, "the base ref is named");
  assert.match(notice, /3 commit/u, "the distance is named");
  assert.match(notice, /rule_tool_sync/u, "the tool to run is named");
  assert.match(notice, /confirm/u, "and that a confirmation is required");
  assert.equal(freshnessNotice({ requiresRebase: false }), null, "a level branch has no notice");
  assert.equal(freshnessNotice(null), null, "no verdict is no notice");
});
