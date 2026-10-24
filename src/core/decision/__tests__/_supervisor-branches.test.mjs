/** Branch coverage for the supervisor guards, the open breaker and shutdown. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { createSupervisor } from "../_supervisor.js";

const client = (overrides = {}) => ({
  listModels: async () => [],
  loadModel: async () => ({}),
  unloadModel: async () => ({}),
  ask: async () => ({ answer: "x" }),
  ...overrides,
});

test("a supervisor needs a client and a model id", () => {
  assert.throws(() => createSupervisor({}), /needs a client/u);
  assert.throws(() => createSupervisor({ client: client() }), /needs a model id/u);
});

test("an open breaker answers from the fallback", async () => {
  const supervisor = createSupervisor({
    client: client({
      ask: async () => {
        throw new Error("boom");
      },
    }),
    model: "m",
    threshold: 2,
  });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await assert.rejects(() => supervisor.ask("p", {}), /boom/u);
  }

  const fallback = await supervisor.ask("p", {}, { fallback: () => "fallback" });

  assert.equal(fallback.ok, false);
  assert.equal(fallback.reason, "breaker-open");
  assert.equal(fallback.value, "fallback");
  assert.equal(supervisor.breaker.state, "open");
  assert.equal(supervisor.breaker.failures, 2);
  assert.match(supervisor.status(), /2 failure/u);
});

test("an open breaker without a fallback throws", async () => {
  const supervisor = createSupervisor({
    client: client({
      ask: async () => {
        throw new Error("boom");
      },
    }),
    model: "m",
    threshold: 1,
  });

  await assert.rejects(() => supervisor.ask("p", {}), /boom/u);
  await assert.rejects(() => supervisor.ask("p", {}), /breaker is open/u);
});

test("shutdown unloads a loaded model once", async () => {
  let state = "loaded";
  let unloads = 0;
  const supervisor = createSupervisor({
    client: client({
      listModels: async () => [{ id: "m", status: { value: state } }],
      unloadModel: async () => {
        unloads += 1;
        state = "unloaded";
      },
    }),
    model: "m",
    pollMs: 0,
    sleep: async () => {},
  });

  await supervisor.ask("p", {});
  await supervisor.shutdown();
  await supervisor.shutdown();

  assert.equal(unloads, 1);
});
