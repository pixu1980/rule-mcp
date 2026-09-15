/** Worker lifecycle: spawn, pending map, aborted-shaped answers. */
import { existsSync } from "node:fs";
import { Worker } from "node:worker_threads";

/** The alias hook worker threads need to resolve `@src/*` without `--import`. */
const ALIAS_HOOK = new URL("../../../../scripts/alias-hook.mjs", import.meta.url);

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

/**
 * The `execArgv` a worker needs to resolve `@src/*`.
 *
 * A parent started with `--import ./scripts/alias-hook.mjs` passes the flag
 * down through `process.execArgv` and the worker inherits it. A parent started
 * from `bin/rule-mcp.js` imports the hook dynamically, which registers it
 * in the parent thread only: a worker started afterwards has its own module
 * graph and dies with ERR_MODULE_NOT_FOUND. This adds the hook for that case,
 * and never twice.
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

    if (entry) {
      pending.delete(message.id);
      entry.resolve(message.result);
    }
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
