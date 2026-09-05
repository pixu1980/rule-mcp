/**
 * @module core/guardrails-guarded
 *
 * checkCode behind a worker thread with a hard timeout (hardening 1.2,
 * finding F-S1). Guardrail regexes run synchronously; on the shared daemon a
 * runaway pattern freezes every connected client and no in-thread timeout can
 * fire. Here the check runs in a persistent worker: on budget overrun the
 * worker is terminated, the call answers "check aborted", and the next call
 * lazily respawns a fresh worker. The CLI one-shot path may keep calling
 * checkCode inline - a hung CLI is ctrl-C, a hung daemon is an outage.
 *
 * Zero new dependencies: node:worker_threads only.
 */

import { Worker } from "node:worker_threads";

import { checkCode } from "./guardrails.js";

/** Default per-check budget; RULE_MCP_CHECK_TIMEOUT_MS overrides. */
const DEFAULT_TIMEOUT_MS = 5000;

/**
 * The worker only earns its cost where a hang is an outage: a long-lived
 * server shared by every client. A CLI one-shot (and every test process) runs
 * inline - spawning a thread that reloads the whole skill set per invocation
 * would be pure overhead. Servers call enableGuardedChecks() at startup.
 */
let _guarded = process.env.RULE_MCP_GUARDED_CHECKS === "1";

/** Route checks through the guarded worker (called by the server entry). */
export function enableGuardedChecks() {
  _guarded = true;
}

let _worker = null;
let _ready = null;
let _seq = 0;
/** @type {Map<number, {resolve: (r: object) => void}>} */
const _pending = new Map();

function defaultTimeoutMs() {
  const raw = Number(process.env.RULE_MCP_CHECK_TIMEOUT_MS);

  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
}

function spawn() {
  const worker = new Worker(new URL("guardrails-worker-thread.js", import.meta.url));
  worker.unref();
  _ready = new Promise((resolve) => {
    const onReady = (message) => {
      if (!message?.ready) {
        return;
      }

      worker.off("message", onReady);
      resolve();
    };
    worker.on("message", onReady);
  });
  worker.on("message", (message) => {
    const entry = _pending.get(message?.id);

    if (entry) {
      _pending.delete(message.id);
      entry.resolve(message.result);
    }
  });
  worker.on("error", () => flushPending("worker-error"));
  worker.on("exit", () => {
    if (_worker === worker) {
      _worker = null;
    }
  });

  return worker;
}

function abortedResult(skillName, reason) {
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

function flushPending(reason) {
  for (const [id, entry] of _pending) {
    _pending.delete(id);
    entry.resolve(abortedResult("unknown", reason));
  }
}

/**
 * Run checkCode in the guarded worker.
 *
 * @param {string} skillName
 * @param {string} code
 * @param {object} [context]
 * @param {{ timeoutMs?: number }} [options]
 * @returns {Promise<object>} the checkCode result, or an aborted-shaped result
 */
export async function checkCodeGuarded(skillName, code, context = {}, options = {}) {
  if (!_guarded) {
    return checkCode(skillName, code, context);
  }

  const timeoutMs = options.timeoutMs ?? defaultTimeoutMs();

  if (!_worker) {
    _worker = spawn();
  }

  const worker = _worker;
  const id = ++_seq;

  const answer = new Promise((resolve) => {
    _pending.set(id, { resolve });
  });
  worker.postMessage({ id, skillName, code, context });

  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => {
      _pending.delete(id);

      if (_worker === worker) {
        _worker = null;
      }
      // Terminate, don't wait: the worker is busy-looping in a regex and will
      // never see a polite message.
      worker.terminate().catch(() => {});
      resolve(abortedResult(skillName, `Check exceeded ${timeoutMs}ms and was terminated.`));
    }, timeoutMs);
    timer.unref?.();
  });

  const result = await Promise.race([answer.then((r) => (clearTimeout(timer), r)), timeout]);

  if (result?.workerError) {
    return abortedResult(skillName, `Worker error: ${result.workerError}`);
  }

  return result;
}

/** Stop the worker (tests and clean shutdown). */
export async function shutdownGuardrailWorker() {
  const worker = _worker;

  _worker = null;
  _pending.clear();

  if (worker) {
    await worker.terminate().catch(() => {});
  }

  _ready = null;

  return _ready;
}
