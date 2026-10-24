/** Branch coverage for the lifecycle: state normalization, retry, timeout and unload. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { createLifecycle } from "../_lifecycle.js";

const noSleep = async () => {};

test("a listing that is not an array reads as an absent model", async () => {
  let calls = 0;
  const lifecycle = createLifecycle({
    client: {
      listModels: async () => {
        calls += 1;

        return calls === 1 ? { models: [] } : [{ id: "m", status: { value: "loaded" } }];
      },
      loadModel: async () => ({}),
      unloadModel: async () => ({}),
    },
    model: "m",
    sleep: noSleep,
  });

  const result = await lifecycle.ensureLoaded();

  assert.equal(result.state, "loaded");
});

test("a model that is already loading is waited for, not loaded twice", async () => {
  let loads = 0;
  let polls = 0;
  const lifecycle = createLifecycle({
    client: {
      listModels: async () => {
        polls += 1;

        return [{ id: "m", status: { value: polls > 1 ? "loaded" : "loading" } }];
      },
      loadModel: async () => {
        loads += 1;
      },
      unloadModel: async () => ({}),
    },
    model: "m",
    pollMs: 0,
    sleep: noSleep,
  });

  const result = await lifecycle.ensureLoaded();

  assert.equal(result.state, "loaded");
  assert.equal(loads, 0);
});

test("a model that is already loaded returns without loading", async () => {
  const lifecycle = createLifecycle({
    client: {
      listModels: async () => [{ id: "m", status: { value: "loaded" } }],
      loadModel: async () => {
        throw new Error("must not load");
      },
      unloadModel: async () => ({}),
    },
    model: "m",
    sleep: noSleep,
  });

  const result = await lifecycle.ensureLoaded();

  assert.equal(result.state, "loaded");
  assert.equal(result.ms, 0);
});

test("a full slot is retried once", async () => {
  let loads = 0;
  const lifecycle = createLifecycle({
    client: {
      listModels: async () => [{ id: "m", status: { value: loads > 0 ? "loaded" : "unloaded" } }],
      loadModel: async () => {
        loads += 1;

        if (loads === 1) {
          throw new Error("model limit reached");
        }
      },
      unloadModel: async () => ({}),
    },
    model: "m",
    sleep: noSleep,
  });

  const result = await lifecycle.ensureLoaded();

  assert.equal(result.state, "loaded");
  assert.equal(loads, 2);
});

test("an already-running model is treated as loaded", async () => {
  let attempted = false;
  const lifecycle = createLifecycle({
    client: {
      listModels: async () => [{ id: "m", status: { value: attempted ? "loaded" : "unloaded" } }],
      loadModel: async () => {
        attempted = true;
        throw new Error("already running");
      },
      unloadModel: async () => ({}),
    },
    model: "m",
    sleep: noSleep,
  });

  const result = await lifecycle.ensureLoaded();

  assert.equal(result.state, "loaded");
});

test("a model that never settles times out and reports a gone model", async () => {
  const lifecycle = createLifecycle({
    client: {
      listModels: async () => [],
      loadModel: async () => ({}),
      unloadModel: async () => ({}),
    },
    model: "m",
    waitTimeoutMs: 0,
    sleep: noSleep,
  });

  await assert.rejects(() => lifecycle.ensureLoaded(), /stayed gone/u);
});

test("unload of an absent model is a no-op", async () => {
  const lifecycle = createLifecycle({
    client: {
      listModels: async () => [],
      loadModel: async () => ({}),
      unloadModel: async () => {
        throw new Error("must not unload");
      },
    },
    model: "m",
    sleep: noSleep,
  });

  const result = await lifecycle.unload();

  assert.equal(result.state, "unloaded");
});

test("unload waits for the model to disappear and ignores a not-running error", async () => {
  let state = "loaded";
  const lifecycle = createLifecycle({
    client: {
      listModels: async () => (state === "gone" ? [] : [{ id: "m", status: { value: state } }]),
      loadModel: async () => ({}),
      unloadModel: async () => {
        throw new Error("not running");
      },
    },
    model: "m",
    pollMs: 0,
    sleep: async () => {
      state = "gone";
    },
  });

  const result = await lifecycle.unload();

  assert.equal(result.state, "unloaded");
});

test("a real unload failure is surfaced", async () => {
  const lifecycle = createLifecycle({
    client: {
      listModels: async () => [{ id: "m", status: { value: "loaded" } }],
      loadModel: async () => ({}),
      unloadModel: async () => {
        throw new Error("boom");
      },
    },
    model: "m",
    sleep: noSleep,
  });

  await assert.rejects(() => lifecycle.unload(), /decision unload failed: boom/u);
});
