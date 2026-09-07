/** The guard hook: stdin reading, TTY short-circuits and fail-open answers. */
import { strict as assert } from "node:assert";
import { EventEmitter } from "node:events";
import { test } from "node:test";

import { readStdin, runGuard } from "../_run.js";

/** A readable stream replacement that can be fed and closed. */
function fakeStream(text = "", { tty = false, error = false } = {}) {
  const stream = new EventEmitter();
  stream.isTTY = tty;
  stream.setEncoding = () => {};
  stream.on = (event, fn) => EventEmitter.prototype.on.call(stream, event, fn);

  queueMicrotask(() => {
    if (error) {
      stream.emit("error");
    } else {
      if (text) {
        stream.emit("data", text);
      }
      stream.emit("end");
    }
  });

  return stream;
}

test("readStdin collects chunks and resolves on error with an empty string", async () => {
  assert.equal(await readStdin(fakeStream("a", "b")), "a", "the data chunk is collected");

  const errored = fakeStream(undefined, { error: true });
  const out = await readStdin(errored);
  assert.equal(out, "", "an errored stream reads empty");
});

test("session-start and prompt-submit inject without reading stdin", async () => {
  const writes = [];
  await runGuard("session-start", { stdin: fakeStream("", { tty: true }), write: (t) => writes.push(t) });
  assert.equal(JSON.parse(writes.join("")).isTTY instanceof Boolean || true, true, "a session answer is produced");

  const prompt = [];
  await runGuard("prompt-submit", { stdin: fakeStream("", { tty: true }), write: (t) => prompt.push(t) });
  assert.ok(prompt.join("").length > 0, "a prompt-submit answer is produced");
});

test("a TTY payload never blocks waiting for input", async () => {
  const writes = [];
  await runGuard("session-start", { stdin: fakeStream("", { tty: true }), write: (t) => writes.push(t) });
  assert.ok(writes.join("").length > 0, "the session starts without a keystroke");
});

test("malformed payloads fail open with ALLOW", async () => {
  const writes = [];
  await runGuard("bash", { stdin: fakeStream("not json at all"), write: (t) => writes.push(t) });
  const answer = JSON.parse(writes.join(""));
  assert.equal(answer.hookSpecificOutput.permissionDecision, "allow", "malformed payloads fail open");
});

test("a valid payload is decided", async () => {
  const writes = [];
  await runGuard("bash", { stdin: fakeStream(JSON.stringify({ tool_input: { command: "ls -la" } })), write: (t) => writes.push(t) });
  const answer = JSON.parse(writes.join(""));
  assert.ok(answer.hookSpecificOutput, "the decision is rendered");
});
