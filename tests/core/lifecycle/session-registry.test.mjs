/** The capped, evictable session registry and its unref sweeper. */
import test from "node:test";
import assert from "node:assert/strict";

// ── Session registry ──────────────────────────────────────────────

const { SessionRegistry } = await import("../../../src/transport/_session-registry.js");

/** A session double: records whether it was closed. */
function fakeSession(overrides = {}) {
  const closed = { transport: false, server: false };

  return {
    closed,
    session: {
      transport: {
        close: async () => {
          closed.transport = true;
        },
        ...overrides.transport,
      },
      server: {
        close: async () => {
          closed.server = true;
        },
      },
      ...overrides.session,
    },
  };
}

test("the registry bounds how many sessions it holds", () => {
  const registry = new SessionRegistry({ maxSessions: 2 });
  const a = fakeSession();
  const b = fakeSession();
  registry.add("a", a.session);
  registry.add("b", b.session);
  assert.equal(registry.atCapacity(), true);
  assert.equal(registry.size, 2);
});

test("reap closes sessions whose stream is gone", async () => {
  const registry = new SessionRegistry();
  const dead = fakeSession();
  dead.session.isDead = () => true;
  const live = fakeSession();
  live.session.isDead = () => false;
  registry.add("dead", dead.session);
  registry.add("live", live.session);

  const reaped = await registry.reap({ now: Date.now() });
  assert.deepEqual(reaped, ["dead"]);
  assert.equal(dead.closed.transport, true);
  assert.equal(dead.closed.server, true);
  assert.equal(live.closed.transport, false);
  assert.equal(registry.size, 1);
});

test("reap closes sessions idle past the ttl, and touch keeps one alive", async () => {
  const registry = new SessionRegistry({ idleMs: 1000 });
  const stale = fakeSession();
  const fresh = fakeSession();
  registry.add("stale", stale.session, { now: 0 });
  registry.add("fresh", fresh.session, { now: 0 });
  registry.touch("fresh", 5000);

  const reaped = await registry.reap({ now: 5000 });
  assert.deepEqual(reaped, ["stale"]);
  assert.equal(registry.size, 1);
});

test("closeAll empties the registry even when a close throws", async () => {
  const registry = new SessionRegistry();
  const boom = fakeSession({
    transport: {
      close: async () => {
        throw new Error("nope");
      },
    },
  });
  const fine = fakeSession();
  registry.add("boom", boom.session);
  registry.add("fine", fine.session);

  await registry.closeAll();
  assert.equal(registry.size, 0);
  assert.equal(fine.closed.transport, true);
  assert.equal(fine.closed.server, true);
});

test("the sweeper never holds the event loop open", () => {
  const registry = new SessionRegistry({ sweepMs: 50 });
  const timer = registry.startSweeper();
  assert.equal(typeof timer.hasRef, "function");
  assert.equal(timer.hasRef(), false, "the sweep interval must be unref'd");
  registry.stopSweeper();
  assert.equal(registry.sweeping, false);
});
