

/* eslint-disable unicorn/prefer-https -- the client is loopback HTTP, and the refusal tests name remote HTTP hosts */
/** The decision client refuses every host but loopback, and never retries. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { assertLoopbackUrl, createDecisionClient, DecisionClientError } from "../_client.js";
import { startFakeServer } from "./fixtures/_fake-server.mjs";

const QUESTIONS = {
  route: {
    type: "choice",
    options: ["billing", "shipping"],
  },
};

test("a URL that is not loopback is refused with the reason, without a socket", () => {
  const refused = [
    ["http://example.com:9931", /loopback/u],
    ["http://127.0.0.1.evil.com:9931", /loopback/u],
    ["http://127.0.0.1@evil.com:9931", /loopback/u],
    ["http://0.0.0.0:9931", /loopback/u],
    ["http://127.0.0.2:9931", /loopback/u],
    ["file:///tmp/decision.sock", /http/u],
    ["not a url", /invalid/u],
  ];

  for (const [baseUrl, reason] of refused) {
    assert.throws(
      () => createDecisionClient({ baseUrl }),
      (error) => error instanceof DecisionClientError && reason.test(error.message),
      `${baseUrl} must be refused with ${reason}`,
    );
  }
});

test("every loopback spelling is accepted before a call is made", () => {
  assert.equal(assertLoopbackUrl("http://localhost:9931").hostname, "localhost");
  assert.equal(assertLoopbackUrl("http://127.0.0.1:9931").hostname, "127.0.0.1");
  assert.equal(assertLoopbackUrl("http://[::1]:9931").hostname, "[::1]");
  assert.equal(assertLoopbackUrl("https://localhost:9931").protocol, "https:");
});

test("listModels reads GET /models and unwraps the data field", async () => {
  const server = await startFakeServer(({ method, url }) => {
    assert.equal(method, "GET", "the inventory is a GET");
    assert.equal(url, "/models", "the inventory path is fixed");

    return { body: { data: [{ id: "laya", status: { value: "loaded" } }] } };
  });

  try {
    const client = createDecisionClient({ baseUrl: server.url, timeoutMs: 1_000 });
    const models = await client.listModels();

    assert.deepEqual(models, [{ id: "laya", status: { value: "loaded" } }]);
  } finally {
    await server.close();
  }
});

test("ask posts one state with its questions and reports the answers and the wall time", async () => {
  const server = await startFakeServer(({ method, url, body }) => {
    assert.equal(method, "POST", "a decision is a POST");
    assert.equal(url, "/v1/systemone", "the decision path is fixed");
    assert.deepEqual(body, {
      model: "laya",
      state: "I was charged twice",
      questions: QUESTIONS,
    });

    return {
      body: {
        answers: { route: { choice: "billing", probabilities: { billing: 0.9917, shipping: 0.0083 } } },
        usage: { input_tokens: 26 },
      },
    };
  });

  try {
    const client = createDecisionClient({ baseUrl: server.url, timeoutMs: 1_000 });
    const answer = await client.ask("laya", "I was charged twice", QUESTIONS);

    assert.equal(answer.answers.route.choice, "billing");
    assert.equal(answer.usage.input_tokens, 26);
    assert.ok(answer.ms >= 0, "the client reports the wall time it measured");
  } finally {
    await server.close();
  }
});

test("a non-2xx answer is refused with the status and the body", async () => {
  const server = await startFakeServer(() => ({
    status: 500,
    body: { error: { code: 500, message: "model limit reached" } },
  }));

  try {
    const client = createDecisionClient({ baseUrl: server.url, timeoutMs: 1_000 });

    await assert.rejects(
      client.ask("laya", "hello", QUESTIONS),
      (error) => error instanceof DecisionClientError && /500/u.test(error.message) && /model limit reached/u.test(error.message),
    );
  } finally {
    await server.close();
  }
});

test("the hard timeout aborts the call and the client does not retry", async () => {
  const server = await startFakeServer(() => ({ delayMs: 120, body: { answers: {} } }));

  try {
    const client = createDecisionClient({ baseUrl: server.url, timeoutMs: 20 });

    await assert.rejects(client.ask("laya", "hello", QUESTIONS), (error) => error instanceof DecisionClientError && /timed out after 20 ms/u.test(error.message));

    await new Promise((resolve) => setTimeout(resolve, 180));

    assert.equal(server.count, 1, "a timeout is not retried");
  } finally {
    await server.close();
  }
});
