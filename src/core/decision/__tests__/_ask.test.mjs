

/** The breaker fails fast without a socket and closes on the next successful probe. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { createDecisionClient } from "../_client.js";
import { createSupervisor } from "../_supervisor.js";
import { startFakeServer } from "./fixtures/_fake-server.mjs";

const QUESTIONS = { route: { type: "choice", options: ["billing", "shipping"] } };

test("the fourth call answers from the fallback without touching the socket", async () => {
  let now = 0;
  let succeed = false;
  let asks = 0;

  const server = await startFakeServer(({ url }) => {
    if (url !== "/v1/systemone") {
      return { body: { data: [] } };
    }

    asks += 1;

    if (!succeed) {
      return { status: 500, body: { error: { message: "router down" } } };
    }

    return {
      body: {
        answers: { route: { choice: "billing", probabilities: { billing: 0.99, shipping: 0.01 } } },
        usage: { input_tokens: 12 },
      },
    };
  });

  try {
    const client = createDecisionClient({ baseUrl: server.url, timeoutMs: 1_000 });
    const supervisor = createSupervisor({ client, model: "laya", threshold: 3, cooldownMs: 1_000, now: () => now });

    for (let i = 0; i < 3; i += 1) {
      await assert.rejects(supervisor.ask("I was charged twice", QUESTIONS), /router down/u);
    }

    assert.equal(supervisor.breaker.state, "open");
    assert.equal(supervisor.breaker.failures, 3);

    const before = server.count;
    const fallback = await supervisor.ask("I was charged twice", QUESTIONS, { fallback: () => ({ source: "bm25" }) });

    assert.equal(fallback.ok, false);
    assert.equal(fallback.reason, "breaker-open");
    assert.deepEqual(fallback.value, { source: "bm25" });
    assert.equal(server.count, before, "an open breaker never opens a socket");

    succeed = true;
    now += 1_000;

    const probe = await supervisor.ask("I was charged twice", QUESTIONS, { fallback: () => ({ source: "bm25" }) });

    assert.equal(probe.ok, true);
    assert.equal(probe.answers.route.choice, "billing");
    assert.equal(probe.usage.input_tokens, 12);
    assert.equal(supervisor.breaker.state, "closed");
    assert.equal(asks, 4, "three failures and one probe");
  } finally {
    await server.close();
  }
});
