/** Branch coverage for runPlan: abort, throw, and missing outcome fields. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { runPlan, tally } from "../_run-plan.js";

test("an aborted signal skips remaining tasks", async () => {
  const signal = { aborted: true };
  const results = await runPlan([{ id: "a", title: "A", run: async () => ({ status: "ok" }) }], { signal });

  assert.equal(results[0].status, "skip");
  assert.equal(results[0].summary, "canceled");
});

test("a thrown task becomes a fail and the rest keep going", async () => {
  const results = await runPlan([
    {
      id: "boom",
      title: "Boom",
      run: async () => {
        throw new Error("nope");
      },
    },
    { id: "ok", title: "Ok", run: async () => ({ status: "ok", summary: "done" }) },
  ]);

  assert.equal(results[0].status, "fail");
  assert.equal(results[0].summary, "nope");
  assert.equal(results[1].status, "ok");
});

test("a null outcome defaults to ok with empty summary and lines", async () => {
  const results = await runPlan([{ id: "n", title: "N", detail: "d", run: async () => null }]);

  assert.equal(results[0].status, "ok");
  assert.equal(results[0].summary, "");
  assert.deepEqual(results[0].lines, []);
  assert.equal(results[0].detail, "d");
});

test("tally counts every status", () => {
  assert.deepEqual(tally([{ status: "ok" }, { status: "warn" }, { status: "skip" }, { status: "fail" }, { status: "ok" }]), {
    ok: 2,
    warn: 1,
    skip: 1,
    fail: 1,
    total: 5,
  });
});
