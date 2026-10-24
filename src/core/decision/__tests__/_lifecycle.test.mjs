/** Shutdown releases the model, and a stopped router fails instead of hanging. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { createDecisionClient } from "../_client.js";
import { DecisionSupervisorError } from "../_errors.js";
import { createSupervisor } from "../_supervisor.js";
import { startFakeServer } from "./fixtures/_fake-server.mjs";
import { withServer } from "./fixtures/_with-server.mjs";

test("shutdown unloads a loaded model once and waits for the released state", async () => {
  let loaded = true;
  let unloads = 0;

  await withServer(
    ({ url }) => {
      if (url === "/models/unload") {
        unloads += 1;
        loaded = false;

        return { body: { success: true } };
      }

      return { body: { data: [{ id: "laya", status: { value: loaded ? "loaded" : "unloaded" } }] } };
    },
    async ({ client }) => {
      const supervisor = createSupervisor({ client, model: "laya", pollMs: 10 });

      await supervisor.ensureLoaded();
      await supervisor.shutdown();
      await supervisor.shutdown();

      assert.equal(unloads, 1, "shutdown is idempotent");
      assert.match(supervisor.status(), /decision: model laya unloaded; breaker closed/u);
    },
  );
});

test("a stopped router fails the load with a supervisor error instead of hanging", async () => {
  const server = await startFakeServer(() => ({ body: {} }));
  const baseUrl = server.url;

  await server.close();

  const client = createDecisionClient({ baseUrl, timeoutMs: 200 });
  const supervisor = createSupervisor({ client, model: "laya", pollMs: 10, waitTimeoutMs: 500 });

  await assert.rejects(supervisor.ensureLoaded(), (error) => error instanceof DecisionSupervisorError && /status failed/u.test(error.message));
});

test("the status line names the model and the breaker without a call", () => {
  const client = createDecisionClient({ baseUrl: "http://127.0.0.1:9", timeoutMs: 10 });
  const supervisor = createSupervisor({ client, model: "laya" });

  assert.equal(supervisor.status(), "decision: model laya unknown; breaker closed");
});
