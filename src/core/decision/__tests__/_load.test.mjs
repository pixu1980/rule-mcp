

/** A load reports success only once the router reports the settled state. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { DecisionSupervisorError } from "../_errors.js";
import { createSupervisor } from "../_supervisor.js";
import { withServer } from "./fixtures/_with-server.mjs";

test("a load returns only after the state flips, and reports the settled time", async () => {
  let loading = false;
  let readyAt = 0;
  const calls = { load: 0, models: 0 };

  await withServer(
    ({ url }) => {
      if (url === "/models/load") {
        calls.load += 1;
        loading = true;
        readyAt = Date.now() + 150;

        return { body: { success: true } };
      }

      calls.models += 1;
      const state = loading ? (Date.now() >= readyAt ? "loaded" : "loading") : "unloaded";

      return { body: { data: [{ id: "laya", status: { value: state } }] } };
    },
    async ({ client }) => {
      const supervisor = createSupervisor({ client, model: "laya", pollMs: 20, waitTimeoutMs: 2_000 });
      const result = await supervisor.ensureLoaded();

      assert.equal(result.state, "loaded");
      assert.ok(result.ms >= 140, `the reported load time must include the settled wait, got ${result.ms}`);
      assert.equal(calls.load, 1, "the model is loaded once");
      assert.ok(calls.models >= 2, "the state is polled before and after the load");
      assert.match(supervisor.status(), /decision: model laya loaded; breaker closed/u);
    },
  );
});

test("a model limit reached is retried once, then the load waits for the state", async () => {
  let loads = 0;

  await withServer(
    ({ url }) => {
      if (url === "/models/load") {
        loads += 1;

        return loads === 1 ? { status: 500, body: { error: { message: "model limit reached" } } } : { body: { success: true } };
      }

      const state = loads === 0 ? "unloaded" : "loaded";

      return { body: { data: [{ id: "laya", status: { value: state } }] } };
    },
    async ({ client }) => {
      const supervisor = createSupervisor({ client, model: "laya", pollMs: 10, retryDelayMs: 1 });
      const result = await supervisor.ensureLoaded();

      assert.equal(loads, 2, "the slot error is retried exactly once");
      assert.equal(result.state, "loaded");
    },
  );
});

test("a slot error that persists after one retry is reported, not hammered", async () => {
  let loads = 0;

  await withServer(
    ({ url }) => {
      if (url === "/models/load") {
        loads += 1;

        return { status: 500, body: { error: { message: "model limit reached" } } };
      }

      return { body: { data: [{ id: "laya", status: { value: "unloaded" } }] } };
    },
    async ({ client }) => {
      const supervisor = createSupervisor({ client, model: "laya", retryDelayMs: 1 });

      await assert.rejects(supervisor.ensureLoaded(), (error) => error instanceof DecisionSupervisorError && /model limit reached/u.test(error.message));
      assert.equal(loads, 2, "a failed retry stops instead of looping");
    },
  );
});

test("a model that is already running is waited for, not loaded again", async () => {
  let loads = 0;

  await withServer(
    ({ url }) => {
      if (url === "/models/load") {
        loads += 1;

        return { status: 400, body: { error: { message: "model is already running" } } };
      }

      return { body: { data: [{ id: "laya", status: { value: loads === 0 ? "unloaded" : "loaded" } }] } };
    },
    async ({ client }) => {
      const supervisor = createSupervisor({ client, model: "laya", pollMs: 10 });
      const result = await supervisor.ensureLoaded();

      assert.equal(loads, 1);
      assert.equal(result.state, "loaded");
    },
  );
});
