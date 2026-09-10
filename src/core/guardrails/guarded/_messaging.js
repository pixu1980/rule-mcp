

/** Worker lifecycle: spawn, pending map, aborted-shaped answers. */
import { Worker } from "node:worker_threads";

export let worker = null;
export let ready = null;
export let seq = 0;
export const pending = new Map();

/** The shape a check answers when the budget was exceeded or the worker died. */
export function abortedResult(skillName, reason) {
  return {
    skill: skillName,
    total: 1,
    passCount: 0,
    failCount: 1,
    skippedCount: 0,
    passed: [],
    failed: [
      {
        id: "check-timeout",
        wcag: "",
        label: "Guardrail check exceeded its time budget",
        failCount: 1,
        detail: [reason],
        suggestion: "Split the input into smaller units, or simplify the code being checked.",
      },
    ],
    skipped: [],
    aborted: true,
    summary: "❌ Check aborted: input too complex for the time budget. Split it and re-check.",
    allPass: false,
    previousPassed: [],
  };
}

export function flushPending(reason) {
  for (const [id, entry] of pending) {
    pending.delete(id);
    entry.resolve(abortedResult("unknown", reason));
  }
}

export function spawn() {
  const thread = new Worker(new URL("_thread.js", import.meta.url));
  thread.unref();
  ready = new Promise((resolve) => {
    const onReady = (message) => {
      if (!message?.ready) {
        return;
      }

      thread.off("message", onReady);
      resolve();
    };
    thread.on("message", onReady);
  });
  thread.on("message", (message) => {
    const entry = pending.get(message?.id);

    if (entry) {
      pending.delete(message.id);
      entry.resolve(message.result);
    }
  });
  thread.on("error", () => flushPending("worker-error"));
  thread.on("exit", () => {
    if (worker === thread) {
      worker = null;
    }
  });

  return thread;
}

export function currentWorker() {
  return worker;
}

export function setWorker(value) {
  worker = value;
}

export function clearWorker() {
  worker = null;
}

export function nextId() {
  seq += 1;

  return seq;
}
