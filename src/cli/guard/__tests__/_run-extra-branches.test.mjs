

/** Extra branch coverage for runGuard: nullish tool_input/command and fail-open catches. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { runGuard } from "../_run.js";

/** A readable stream replacement that can be fed and closed. */
function fakeStream(text = "") {
  const listeners = {};
  const stream = {
    isTTY: false,
    setEncoding() {},
    on(event, fn) {
      (listeners[event] ??= []).push(fn);

      return stream;
    },
    emit(event, ...args) {
      for (const fn of listeners[event] ?? []) {
        fn(...args);
      }
    },
  };

  queueMicrotask(() => {
    if (text) {
      stream.emit("data", text);
    }

    stream.emit("end");
  });

  return stream;
}

test("structure defaults a missing tool_input to an empty object", async () => {
  const writes = [];

  await runGuard("structure", {
    stdin: fakeStream(JSON.stringify({ tool_input: null, cwd: process.cwd() })),
    write: (text) => writes.push(text),
  });

  assert.equal(JSON.parse(writes.join("")).hookSpecificOutput.permissionDecision, "allow");
});

test("structure fails open when decideStructure throws", () => {
  const alias = fileURLToPath(new URL("../../../../scripts/alias-hook.mjs", import.meta.url));
  const script = `
    import { mock } from "node:test";
    const structureUrl = new URL("./_structure.js", import.meta.url).href;
    mock.module(structureUrl, {
      namedExports: {
        decideStructure() { throw new Error("boom"); },
        structuralSignal() { return ""; },
        noteWriteLanded() {},
      },
    });
    const { runGuard } = await import("./_run.js");
    const listeners = {};
    const stream = {
      isTTY: false,
      setEncoding() {},
      on(event, fn) { (listeners[event] ??= []).push(fn); return stream; },
      emit(event, ...args) { for (const fn of listeners[event] ?? []) fn(...args); },
    };
    queueMicrotask(() => { stream.emit("data", "{}"); stream.emit("end"); });
    const writes = [];
    await runGuard("structure", { stdin: stream, write: (text) => writes.push(text) });
    if (JSON.parse(writes.join("")).hookSpecificOutput.permissionDecision !== "allow") {
      throw new Error("expected allow after decideStructure threw");
    }
  `;

  execFileSync(process.execPath, ["--experimental-test-module-mocks", "--import", alias, "--input-type=module", "-e", script], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
});

test("bash defaults a missing command to an empty string", async () => {
  const writes = [];

  await runGuard("bash", {
    stdin: fakeStream(JSON.stringify({ tool_input: {} })),
    write: (text) => writes.push(text),
  });

  assert.equal(JSON.parse(writes.join("")).hookSpecificOutput.permissionDecision, "allow");
});

test("bash fails open when the decision write throws once", async () => {
  const writes = [];
  let calls = 0;

  await runGuard("bash", {
    stdin: fakeStream(JSON.stringify({ tool_input: { command: "ls" } })),
    write: (text) => {
      calls += 1;

      if (calls === 1) {
        throw new Error("stdout closed");
      }

      writes.push(text);
    },
  });

  assert.equal(calls, 2);
  assert.equal(JSON.parse(writes.join("")).hookSpecificOutput.permissionDecision, "allow");
});
