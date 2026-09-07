/**
 * @module test/stdio-guard.test
 *
 * A stdio server lives and dies with its client (hardening: the orphaned
 * server trap). The guard watches the peer: stdin closing, a stream error, a
 * fatal write error, or the parent pid falling to 1 all end the process -
 * exactly once, and never on a handle that would keep it alive.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { installStdioGuard, PARENT_POLL_MS } from "../../../src/transport/_stdio-guard.js";

/** A minimal emitter: the guard only needs on/off/emit and passes Errors through. */
function emitter() {
  const handlers = new Map();
  return {
    on(event, fn) {
      handlers.set(event, [...(handlers.get(event) ?? []), fn]);
    },
    off(event, fn) {
      handlers.set(
        event,
        (handlers.get(event) ?? []).filter((h) => h !== fn),
      );
    },
    emit(event, ...args) {
      for (const fn of handlers.get(event) ?? []) {
        fn(...args);
      }
    },
    setEncoding: () => {},
  };
}

function fakePeer() {
  return { stdin: emitter(), stdout: emitter(), stderr: emitter() };
}

test("stdin end fires onLost exactly once", () => {
  const peer = fakePeer();
  const lost = [];
  installStdioGuard({ ...peer, onLost: (r) => lost.push(r), ppid: () => 777 });
  peer.stdin.emit("end");
  peer.stdin.emit("end");
  peer.stdin.emit("close");
  assert.deepEqual(lost, ["stdin closed"]);
});

test("a fatal write error is a lost peer", () => {
  const peer = fakePeer();
  const lost = [];
  installStdioGuard({ ...peer, onLost: (r) => lost.push(r), ppid: () => 777 });
  peer.stdout.emit("error", Object.assign(new Error("x"), { code: "EPIPE" }));
  assert.equal(lost.length, 1);
});

test("a transient write error is not a lost peer", () => {
  const peer = fakePeer();
  const lost = [];
  installStdioGuard({ ...peer, onLost: (r) => lost.push(r), ppid: () => 777 });
  peer.stderr.emit("error", new Error("EAGAIN"));
  assert.deepEqual(lost, []);
});

test("the parent-pid backstop fires when ppid falls to 1", () => {
  const peer = fakePeer();
  const lost = [];
  let ppid = 42;
  const stop = installStdioGuard({
    ...peer,
    onLost: (r) => lost.push(r),
    ppid: () => ppid,
    pollMs: 5,
  });
  ppid = 1;
  return new Promise((resolve) => {
    setTimeout(() => {
      assert.deepEqual(lost, ["parent process is gone"]);
      stop();
      resolve();
    }, 40);
  });
});

test("stopping the guard removes the listeners", () => {
  const peer = fakePeer();
  const lost = [];
  const stop = installStdioGuard({ ...peer, onLost: (r) => lost.push(r), ppid: () => 777 });
  stop();
  peer.stdin.emit("end");
  assert.deepEqual(lost, []);
});

test("the poll cadence and defaults are exported", () => {
  assert.equal(PARENT_POLL_MS, 10_000);
});
