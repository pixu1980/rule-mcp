

/** Branch coverage for the decision client's error, model and fallback arms. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { createDecisionClient, DecisionClientError } from "../_client.js";
import { startFakeServer } from "./fixtures/_fake-server.mjs";

test("createDecisionClient refuses an invalid timeout and a missing fetch", () => {
  for (const timeoutMs of [0, -1, NaN]) {
    assert.throws(
      () => createDecisionClient({ timeoutMs }),
      (error) => error instanceof DecisionClientError && /positive number/u.test(error.message),
    );
  }
  assert.throws(() => createDecisionClient({ fetchImpl: "nope" }), /fetch implementation/u);
});

test("loadModel and unloadModel post the model to their paths", async () => {
  const calls = [];
  const server = await startFakeServer(({ url, body }) => {
    calls.push([url, body.model]);

    return { body: { ok: true } };
  });

  try {
    const client = createDecisionClient({ baseUrl: server.url, timeoutMs: 1_000 });

    assert.deepEqual(await client.loadModel("laya"), { ok: true });
    assert.deepEqual(await client.unloadModel("laya"), { ok: true });
    assert.deepEqual(calls, [
      ["/models/load", "laya"],
      ["/models/unload", "laya"],
    ]);
  } finally {
    await server.close();
  }
});

test("listModels returns the body when data is absent", async () => {
  const server = await startFakeServer(() => ({ body: { models: [] } }));

  try {
    const client = createDecisionClient({ baseUrl: server.url, timeoutMs: 1_000 });

    assert.deepEqual(await client.listModels(), { models: [] });
  } finally {
    await server.close();
  }
});

test("ask defaults answers and usage to empty objects", async () => {
  const server = await startFakeServer(() => ({ body: {} }));

  try {
    const client = createDecisionClient({ baseUrl: server.url, timeoutMs: 1_000 });
    const result = await client.ask("m", "s", {});

    assert.deepEqual(result.answers, {});
    assert.deepEqual(result.usage, {});
    assert.ok(result.ms >= 0);
  } finally {
    await server.close();
  }
});
