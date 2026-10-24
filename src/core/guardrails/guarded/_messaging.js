/** Worker lifecycle: spawn, pending map, aborted-shaped answers. */
import { existsSync } from "node:fs";
import { Worker } from "node:worker_threads";

/** The alias hook worker threads need to resolve `@src/*` without `--import`. */
const ALIAS_HOOK = new URL("../../../../scripts/alias-hook.mjs", import.meta.url);

/** The live worker thread, or null when none has been spawned. */
export let worker = null;

/** Resolves once the current worker has loaded its skill set. */
export let ready = null;

/** Monotonic id for the request/response correlation. */
export let seq = 0;

/** Pending checks keyed by request id; resolved by the worker's answer. */
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

/**
 * Resolve every pending check with an aborted-shaped answer.
 *
 * @param {string} reason - Why the checks could not be answered
 */
export function flushPending(reason) {
  for (const [id, entry] of pending) {
    pending.delete(id);
    entry.resolve(abortedResult("unknown", reason));
  }
}

/**
 * The `execArgv` a worker needs to resolve `@src/*`.
 *
 * @returns {string[]}
 */
export function workerExecArgv() {
  // Always pass the hook explicitly. Copying `process.execArgv` wholesale would
  // also copy `-e`/`--input-type` and make the worker evaluate the parent's
  // eval script instead of _thread.js; returning `[]` would drop the hook a
  // parent started with `--import` relies on Node to propagate.
  return existsSync(ALIAS_HOOK) ? ["--import", ALIAS_HOOK.href] : [];
}

/**
 * Spawn the guardrail worker and wire its lifecycle events.
 *
 * @returns {import("node:worker_threads").Worker} the new thread
 */
export function spawn() {
  const thread = new Worker(new URL("_thread.js", import.meta.url), { execArgv: workerExecArgv() });
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

    if (!entry) {
      return;
    }

    pending.delete(message.id);
    entry.resolve(message.result);
  });
  thread.on("error", (error) => {
    process.stderr.write(`guardrail worker error: ${error.stack ?? error.message}\n`);
    flushPending("worker-error");
  });
  thread.on("exit", () => {
    if (worker === thread) {
      worker = null;
    }
  });

  return thread;
}

/**
 * The live worker, or null when none is running.
 *
 * @returns {import("node:worker_threads").Worker|null}
 */
export function currentWorker() {
  return worker;
}

/**
 * Replace the live worker reference.
 *
 * @param {import("node:worker_threads").Worker|null} value
 */
export function setWorker(value) {
  worker = value;
}

/** Drop the live worker reference after a termination. */
export function clearWorker() {
  worker = null;
}

/**
 * The next request id.
 *
 * @returns {number}
 */
export function nextId() {
  seq += 1;

  return seq;
}
