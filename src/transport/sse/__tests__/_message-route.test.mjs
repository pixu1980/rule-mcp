/** POST /message routing: size cap, missing session, invalid JSON, relay. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { handleMessagePost } from "../_message-route.js";
import { sessions, registry } from "../_state.js";

/** An async-iterable request body with a pathname/scene. */
function fakeRequest({ chunks = ["{}"], pathname = "/message?sessionId=s1" } = {}) {
  let index = 0;

  return {
    url: pathname,
    [Symbol.asyncIterator]() {
      return {
        next: async () => (index < chunks.length ? { value: Buffer.from(chunks[index++]), done: false } : { done: true }),
      };
    },
  };
}

/** A response recorder with writeHead/end. */
function fakeRes() {
  const record = { status: 200, body: "" };

  return {
    record,
    headersSent: false,
    writeHead(status) {
      record.status = status;
    },
    end(body) {
      record.body = body ?? "";
    },
    setHeader() {},
  };
}

test("an oversized body is refused with 413", async () => {
  const res = fakeRes();
  const big = `{"pad":"${"x".repeat(1_500_000)}"}`;
  await handleMessagePost(fakeRequest({ chunks: [big] }), res, new URL("http://x/message"));
  assert.equal(res.record.status, 413, "the size cap applies");
  assert.match(res.record.body, /too large/, "the error names the cap");
});

test("a missing session is refused with 404", async () => {
  const res = fakeRes();
  await handleMessagePost(fakeRequest({ chunks: ["{}"], pathname: "/message?sessionId=missing" }), res, new URL("http://x/message?sessionId=missing"));
  assert.equal(res.record.status, 404, "no session means not found");
  assert.match(res.record.body, /No SSE session/, "the error names the missing session");
});

test("invalid JSON is refused with 400", async () => {
  sessions.set("s1", { transport: { handlePostMessage: async () => {} } });
  try {
    const res = fakeRes();
    await handleMessagePost(fakeRequest({ chunks: ["{ broken"] }), res, new URL("http://x/message?sessionId=s1"));
    assert.equal(res.record.status, 400, "malformed JSON fails");
    assert.match(res.record.body, /Invalid JSON/, "the error names the failure");
  } finally {
    sessions.delete("s1");
  }
});

test("a live message relays to the session transport", async () => {
  let relayed = null;
  sessions.set("s1", { transport: { handlePostMessage: async (request, res) => (relayed = true) } });
  registry.touch = () => {};
  const log = console.error;
  console.error = () => {};
  try {
    const res = fakeRes();
    await handleMessagePost(fakeRequest(), res, new URL("http://x/message?sessionId=s1"));
    assert.equal(relayed, true, "the message reaches the transport");
  } finally {
    console.error = log;
    sessions.delete("s1");
  }
});